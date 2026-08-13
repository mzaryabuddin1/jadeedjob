import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  EntityManager,
  In,
  IsNull,
  MoreThan,
  Not,
  Repository,
} from 'typeorm';
import { IdempotencyService } from 'src/idempotency/idempotency.service';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { Job } from 'src/job/entities/job.entity';
import { ModerationService } from 'src/moderation/moderation.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import {
  normalizeCompanyPermissions,
} from 'src/pages/company-permissions';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { PageMember } from 'src/pages/entities/page-member.entity';
import { User } from 'src/users/entities/user.entity';
import { ChatConversation } from './entities/chat-conversation.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatParticipant } from './entities/chat-participant.entity';
import { ChatReadState } from './entities/chat-read-state.entity';
import { JobInvitation } from './entities/job-invitation.entity';
import { ObjectStorageService } from 'src/storage/object-storage.service';

type MessageInput = {
  content?: string;
  text?: string;
  mediaUrl?: string;
  messageType?: 'text' | 'image' | 'video' | 'audio' | 'file';
  attachments?: Array<{
    assetId?: string;
    fileUrl?: string;
    fileName?: string;
    contentType?: string;
    sizeBytes?: number;
  }>;
  clientMessageId?: string;
};

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    @InjectRepository(ChatConversation)
    private readonly conversationRepo: Repository<ChatConversation>,
    @InjectRepository(ChatParticipant)
    private readonly participantRepo: Repository<ChatParticipant>,
    @InjectRepository(ChatReadState)
    private readonly readRepo: Repository<ChatReadState>,
    @InjectRepository(JobInvitation)
    private readonly invitationRepo: Repository<JobInvitation>,
    @InjectRepository(JobApplication)
    private readonly appRepo: Repository<JobApplication>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(PageMember)
    private readonly pageMemberRepo: Repository<PageMember>,
    @InjectRepository(CompanyPage)
    private readonly companyRepo: Repository<CompanyPage>,
    private readonly notificationsService: NotificationsService,
    private readonly moderationService: ModerationService,
    private readonly idempotencyService: IdempotencyService,
    private readonly objectStorageService: ObjectStorageService,
  ) {}

  async ensureApplicationConversation(
    applicationId: number,
    manager: EntityManager = this.conversationRepo.manager,
  ) {
    const conversations = manager.getRepository(ChatConversation);
    const existing = await conversations.findOne({
      where: { applicationId },
      relations: ['job', 'job.page', 'application', 'application.applicant', 'participants'],
    });
    if (existing) return existing;

    const application = await manager.getRepository(JobApplication).findOne({
      where: { id: applicationId },
      relations: ['job', 'job.page', 'job.creator', 'applicant'],
    });
    if (!application) throw new NotFoundException('Job application not found');

    const conversation = await conversations.save(
      conversations.create({
        type: 'application',
        jobId: application.jobId,
        applicationId: application.id,
        createdByUserId: application.applicantId,
        companyId: application.job.pageId || null,
        writeState: this.applicationWritable(application.status)
          ? 'active'
          : 'read_only',
        readOnlyReason: this.applicationWritable(application.status)
          ? null
          : `application_${application.status}`,
        lastActivityAt: application.updatedAt || application.createdAt,
      }),
    );
    const participantIds = [
      ...new Set([application.applicantId, application.job.createdBy]),
    ];
    await manager.getRepository(ChatParticipant).save(
      participantIds.map((userId) =>
        manager.getRepository(ChatParticipant).create({
          conversationId: conversation.id,
          userId,
          active: true,
        }),
      ),
    );
    return conversations.findOne({
      where: { id: conversation.id },
      relations: ['job', 'job.page', 'job.creator', 'application', 'application.applicant', 'participants'],
    });
  }

  async resolveConversation(reference: string | number) {
    const value = String(reference || '').trim();
    if (!value) throw new NotFoundException('Chat not found');
    if (/^\d+$/.test(value)) {
      return this.ensureApplicationConversation(Number(value));
    }
    const conversation = await this.conversationRepo.findOne({
      where: { id: value },
      relations: [
        'job',
        'job.page',
        'job.creator',
        'application',
        'application.applicant',
        'participants',
        'participants.user',
      ],
    });
    if (!conversation) throw new NotFoundException('Chat not found');
    return conversation;
  }

  async userCanAccessApplication(userId: number, applicationId: number) {
    try {
      const conversation = await this.ensureApplicationConversation(applicationId);
      return this.canAccess(conversation, userId);
    } catch {
      return false;
    }
  }

  async canWriteConversation(userId: number, reference: string | number) {
    const conversation = await this.resolveConversation(reference);
    await this.assertCanMutate(conversation, userId);
    return true;
  }

  async assertCanJoinConversation(
    userId: number,
    reference: string | number,
  ) {
    const conversation = await this.resolveConversation(reference);
    if (!(await this.canAccess(conversation, userId))) {
      throw new ForbiddenException('You cannot view this chat');
    }
    if (await this.conversationBlocked(conversation, userId)) {
      throw new ForbiddenException({
        code: 'PROFILE_BLOCKED',
        message: 'This conversation is unavailable because of a blocked relationship',
      });
    }
    return conversation;
  }

  async realtimeAudienceIds(reference: string | number) {
    const conversation = await this.resolveConversation(reference);
    const participants = conversation.participants?.length
      ? conversation.participants
      : await this.participantRepo.find({
          where: { conversationId: conversation.id, active: true },
        });
    return {
      conversationId: conversation.id,
      userIds: [
        ...new Set(
          participants
            .filter((participant) => participant.active !== false)
            .map((participant) => participant.userId),
        ),
      ],
    };
  }

  async listChats(userId: number, page = 1, limit = 20) {
    const currentPage = Math.max(1, Number(page) || 1);
    const take = Math.min(100, Math.max(1, Number(limit) || 20));
    const companyIds = await this.companyChatIds(userId);
    const qb = this.conversationRepo
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.participants', 'participant')
      .leftJoinAndSelect('participant.user', 'participantUser')
      .leftJoinAndSelect('conversation.job', 'job')
      .leftJoinAndSelect('job.page', 'page')
      .leftJoinAndSelect('job.creator', 'creator')
      .leftJoinAndSelect('conversation.application', 'application')
      .leftJoinAndSelect('application.applicant', 'applicant')
      .where(
        new Brackets((where) => {
          where.where('participant.userId = :userId', { userId });
          if (companyIds.length) {
            where.orWhere('conversation.companyId IN (:...companyIds)', {
              companyIds,
            });
          }
        }),
      )
      .distinct(true)
      .orderBy('conversation.lastActivityAt', 'DESC')
      .addOrderBy('conversation.createdAt', 'DESC');
    const candidates = await qb.getMany();
    const visible: ChatConversation[] = [];
    for (const conversation of candidates) {
      if (!(await this.canAccess(conversation, userId))) continue;
      if (await this.conversationBlocked(conversation, userId)) continue;
      visible.push(conversation);
    }
    const pageItems = visible.slice(
      (currentPage - 1) * take,
      currentPage * take,
    );
    return {
      data: await Promise.all(
        pageItems.map((conversation) =>
          this.formatConversationSummary(conversation, userId),
        ),
      ),
      total: visible.length,
      totalPages: Math.ceil(visible.length / take),
      currentPage,
    };
  }

  async getMessages(
    reference: string | number,
    userId: number,
    pageOrBefore: number | string = 1,
    limit = 20,
  ) {
    const conversation = await this.resolveConversation(reference);
    if (!(await this.canAccess(conversation, userId))) {
      throw new ForbiddenException('You cannot view this chat');
    }
    const take = Math.min(100, Math.max(1, Number(limit) || 20));
    const before =
      typeof pageOrBefore === 'string' && pageOrBefore
        ? Number(pageOrBefore)
        : undefined;
    const page =
      typeof pageOrBefore === 'number'
        ? Math.max(1, Number(pageOrBefore) || 1)
        : 1;
    const qb = this.messageRepo
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.conversationId = :conversationId', {
        conversationId: conversation.id,
      })
      .andWhere('message.moderationStatus = :moderationStatus', {
        moderationStatus: 'visible',
      })
      .orderBy('message.id', 'DESC')
      .take(take + 1);
    if (before && Number.isInteger(before) && before > 0) {
      qb.andWhere('message.id < :before', { before });
    } else if (page > 1) {
      qb.skip((page - 1) * take);
    }
    const messages = await qb.getMany();
    const hasMore = messages.length > take;
    const pageItems = (hasMore ? messages.slice(0, take) : messages).reverse();
    const total = await this.messageRepo.count({
      where: {
        conversationId: conversation.id,
        moderationStatus: 'visible',
      },
    });
    return {
      data: await Promise.all(
        pageItems.map((message) =>
          this.formatMessage(message, conversation),
        ),
      ),
      nextBefore:
        hasMore && pageItems.length ? String(pageItems[0].id) : null,
      total,
      totalPages: Math.ceil(total / take),
      currentPage: page,
      readOnly: !(await this.isWritable(conversation)),
      readOnlyReason: conversation.readOnlyReason || null,
    };
  }

  async sendMessage(
    senderId: number,
    input:
      | (MessageInput & { conversationId: string | number })
      | (MessageInput & { jobApplicationId: number }),
  ) {
    const reference =
      'conversationId' in input
        ? input.conversationId
        : input.jobApplicationId;
    const conversation = await this.resolveConversation(reference);
    await this.assertCanMutate(conversation, senderId);
    const text = String(input.content ?? input.text ?? '').trim();
    const attachments = await this.normalizeAttachments(
      conversation.id,
      senderId,
      input.attachments || [],
    );
    const mediaUrl = input.mediaUrl
      ? await this.normalizeLegacyMediaUrl(
          conversation.id,
          senderId,
          input.mediaUrl,
        )
      : null;
    const type =
      input.messageType ||
      (attachments.length || mediaUrl ? 'file' : 'text');
    if (!text && !attachments.length && !mediaUrl) {
      throw new BadRequestException('A message needs text or an attachment');
    }
    if (text.length > 2000) {
      throw new BadRequestException('Message cannot exceed 2000 characters');
    }
    const clientMessageId =
      String(input.clientMessageId || '').trim() || null;
    if (clientMessageId) {
      const existing = await this.messageRepo.findOne({
        where: { conversationId: conversation.id, senderId, clientMessageId },
        relations: ['sender'],
      });
      if (existing) return this.formatMessage(existing, conversation);
    }

    const message = await this.messageRepo.save(
      this.messageRepo.create({
        conversationId: conversation.id,
        jobApplicationId: conversation.applicationId || null,
        senderId,
        clientMessageId,
        content: text || null,
        mediaUrl,
        attachments: attachments.length ? attachments : null,
        messageType: type,
      }),
    );
    conversation.lastActivityAt = message.createdAt || new Date();
    await this.conversationRepo.save(conversation);
    const saved = await this.messageRepo.findOne({
      where: { id: message.id },
      relations: ['sender'],
    });
    const formatted = await this.formatMessage(saved, conversation);

    const recipients = await this.recipientIds(conversation, senderId);
    await Promise.all(
      recipients.map((userId) =>
        this.notificationsService.create({
          userId,
          type: 'chat_message',
          title: 'New message',
          message: text || 'You received a new attachment.',
          data: {
            chatId: conversation.id,
            conversationId: conversation.id,
            applicationId: conversation.applicationId,
            jobId: conversation.jobId,
            companyId: conversation.companyId,
          },
        }),
      ),
    );
    return formatted;
  }

  async markRead(reference: string | number, userId: number) {
    const conversation = await this.resolveConversation(reference);
    if (!(await this.canAccess(conversation, userId))) {
      throw new ForbiddenException('You cannot update this chat');
    }
    const latest = await this.messageRepo.findOne({
      where: {
        conversationId: conversation.id,
        moderationStatus: 'visible',
      },
      order: { id: 'DESC' },
    });
    let state = await this.readRepo.findOne({
      where: { conversationId: conversation.id, userId },
    });
    if (!state) {
      state = this.readRepo.create({ conversationId: conversation.id, userId });
    }
    state.lastReadMessageId = latest?.id || null;
    state.readAt = new Date();
    await this.readRepo.save(state);
    if (conversation.applicationId) {
      await this.messageRepo.update(
        {
          conversationId: conversation.id,
          senderId: Not(userId),
          readAt: IsNull(),
        },
        { readAt: state.readAt },
      );
    }
    return {
      chatId: conversation.id,
      conversationId: conversation.id,
      lastReadMessageId: state.lastReadMessageId,
      readAt: state.readAt,
    };
  }

  async getReportableMessage(
    reference: string | number,
    messageId: number,
    userId: number,
  ) {
    const conversation = await this.resolveConversation(reference);
    if (!(await this.canAccess(conversation, userId))) {
      throw new ForbiddenException('You cannot view this chat');
    }
    const message = await this.messageRepo.findOne({
      where: { id: messageId, conversationId: conversation.id },
      relations: ['sender'],
    });
    if (
      !message ||
      (message.moderationStatus && message.moderationStatus !== 'visible')
    ) {
      throw new NotFoundException('Chat message not found');
    }
    return {
      targetType: 'chat_message' as const,
      targetId: String(message.id),
      targetOwnerUserId: message.senderId,
      targetCompanyId: conversation.companyId || null,
      snapshot: {
        conversationId: conversation.id,
        messageId: String(message.id),
        senderId: String(message.senderId),
        content: message.content,
        attachments: message.attachments || [],
        createdAt: message.createdAt,
      },
    };
  }

  async getChatOptions(
    viewerId: number,
    profileType: string,
    profileId: number,
  ) {
    const type = this.moderationService.parseProfileType(profileType);
    await this.moderationService.assertInteractionAllowed(
      viewerId,
      type,
      profileId,
    );
    if (type === 'user' && profileId === viewerId) {
      return {
        available: false,
        action: 'invite',
        jobs: [],
        unavailableReason: 'You cannot message yourself',
      };
    }
    if (type === 'company') {
      const company = await this.companyRepo.findOne({ where: { id: profileId } });
      if (!company || company.verificationStatus !== 'approved') {
        throw new NotFoundException('Profile not found');
      }
      const jobs = await this.jobRepo.find({
        where: { pageId: profileId, isActive: true, status: 'active' },
        order: { createdAt: 'DESC' },
        take: 100,
      });
      return {
        available: jobs.length > 0,
        action: 'inquiry',
        jobs: jobs.map((job) => ({
          id: String(job.id),
          title: job.title,
          companyName: company.company_name,
        })),
        ...(jobs.length ? {} : { unavailableReason: 'No active jobs are available' }),
      };
    }

    const managedJobs = await this.findManagedActiveJobs(viewerId);
    if (managedJobs.length) {
      return {
        available: true,
        action: 'invite',
        jobs: managedJobs.map((job) => ({
          id: String(job.id),
          title: job.title,
          companyName: job.page?.company_name,
        })),
      };
    }
    const targetJobs = await this.jobRepo.find({
      where: { createdBy: profileId, pageId: IsNull(), isActive: true, status: 'active' },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return {
      available: targetJobs.length > 0,
      action: 'inquiry',
      jobs: targetJobs.map((job) => ({ id: String(job.id), title: job.title })),
      ...(targetJobs.length ? {} : { unavailableReason: 'No chat context is available' }),
    };
  }

  async createContext(
    userId: number,
    input: {
      action: 'invite' | 'inquiry';
      profileType: 'user' | 'company';
      profileId: string | number;
      jobId: string | number;
      clientRequestId: string;
    },
  ) {
    return this.idempotencyService.execute(
      userId,
      'chat_context',
      input.clientRequestId,
      input,
      () => this.createContextInternal(userId, input),
    );
  }

  async updateInvitation(
    invitationId: string,
    userId: number,
    action: 'accept' | 'decline' | 'cancel',
  ) {
    return this.invitationRepo.manager.transaction(async (manager) => {
      const invitation = await manager.getRepository(JobInvitation).findOne({
        where: { id: invitationId },
        relations: ['conversation', 'job', 'job.page'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!invitation) throw new NotFoundException('Job invitation not found');
      if (invitation.status !== 'pending') {
        throw new BadRequestException('Invitation is no longer pending');
      }
      if (action === 'cancel') {
        if (invitation.inviterUserId !== userId) {
          throw new ForbiddenException('Only the inviter can cancel this invitation');
        }
        invitation.status = 'cancelled';
      } else {
        if (invitation.inviteeUserId !== userId) {
          throw new ForbiddenException('Only the invited user can respond');
        }
        invitation.status = action === 'accept' ? 'accepted' : 'declined';
      }
      invitation.respondedAt = new Date();

      let application: JobApplication = null;
      if (action === 'accept') {
        application = await this.acceptInvitationApplication(invitation, manager);
        invitation.conversation.applicationId = application.id;
        invitation.conversation.type = 'application';
        invitation.conversation.writeState = 'active';
        invitation.conversation.readOnlyReason = null;
      } else {
        invitation.conversation.writeState = 'read_only';
        invitation.conversation.readOnlyReason = `invitation_${invitation.status}`;
      }
      await manager.save(invitation.conversation);
      await manager.save(invitation);

      await this.notificationsService.create({
        userId:
          userId === invitation.inviterUserId
            ? invitation.inviteeUserId
            : invitation.inviterUserId,
        type: 'job_invitation_status',
        title: 'Job invitation updated',
        message: `The invitation is now ${invitation.status}.`,
        data: {
          chatId: invitation.conversationId,
          id: invitation.id,
          invitationId: invitation.id,
          status: invitation.status,
          invitationStatus: invitation.status,
          viewerAction: null,
          jobId: invitation.jobId,
          applicationId: application?.id,
        },
      });
      return {
        invitation: {
          id: invitation.id,
          invitationId: invitation.id,
          status: invitation.status,
          viewerAction: this.invitationViewerAction(invitation, userId),
          respondedAt: invitation.respondedAt,
        },
        chatId: invitation.conversationId,
        conversationId: invitation.conversationId,
        applicationId: application?.id || null,
      };
    });
  }

  async syncApplicationConversation(applicationId: number, status: string) {
    const conversation = await this.conversationRepo.findOne({
      where: { applicationId },
    });
    if (!conversation) return;
    conversation.writeState = this.applicationWritable(status)
      ? 'active'
      : 'read_only';
    conversation.readOnlyReason = this.applicationWritable(status)
      ? null
      : `application_${status}`;
    await this.conversationRepo.save(conversation);
  }

  formatUploadedAttachment(file: Express.Multer.File, fileUrl: string) {
    return {
      fileName: file.filename,
      fileUrl,
      contentType: file.mimetype,
    };
  }

  private async createContextInternal(userId: number, input: any) {
    const type = this.moderationService.parseProfileType(input.profileType);
    const profileId = Number(input.profileId);
    const jobId = Number(input.jobId);
    if (!Number.isInteger(profileId) || !Number.isInteger(jobId)) {
      throw new BadRequestException('Invalid profile or job ID');
    }
    await this.moderationService.assertInteractionAllowed(
      userId,
      type,
      profileId,
    );
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      relations: ['page', 'creator'],
    });
    if (!job || !job.isActive || job.status !== 'active') {
      throw new BadRequestException('Job is not active');
    }

    if (input.action === 'invite') {
      if (type !== 'user' || profileId === userId) {
        throw new BadRequestException('Invitations require another user profile');
      }
      if (!(await this.canManageJobForChat(job, userId))) {
        throw new ForbiddenException('You cannot invite workers to this job');
      }
      const duplicate = await this.invitationRepo.findOne({
        where: { jobId, inviteeUserId: profileId, status: 'pending' },
      });
      if (duplicate) {
        return this.contextResponse(
          duplicate.conversationId,
          job,
          profileId,
          userId,
          duplicate,
        );
      }
      return this.conversationRepo.manager.transaction(async (manager) => {
        const conversation = await manager.getRepository(ChatConversation).save(
          manager.getRepository(ChatConversation).create({
            type: 'invitation',
            jobId,
            companyId: job.pageId || null,
            createdByUserId: userId,
            clientRequestId: input.clientRequestId,
            writeState: 'active',
            lastActivityAt: new Date(),
          }),
        );
        await manager.getRepository(ChatParticipant).save(
          [userId, profileId].map((participantUserId) =>
            manager.getRepository(ChatParticipant).create({
              conversationId: conversation.id,
              userId: participantUserId,
            }),
          ),
        );
        const invitation = await manager.getRepository(JobInvitation).save(
          manager.getRepository(JobInvitation).create({
            conversationId: conversation.id,
            jobId,
            inviterUserId: userId,
            inviteeUserId: profileId,
            status: 'pending',
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            clientRequestId: input.clientRequestId,
          }),
        );
        await this.notificationsService.create({
          userId: profileId,
          type: 'job_invitation',
          title: 'New job invitation',
          message: `You were invited to ${job.title}.`,
          data: {
            chatId: conversation.id,
            id: invitation.id,
            invitationId: invitation.id,
            status: invitation.status,
            invitationStatus: invitation.status,
            viewerAction: 'respond',
            jobId,
            companyId: job.pageId,
          },
        });
        return this.contextResponse(
          conversation.id,
          job,
          profileId,
          userId,
          invitation,
        );
      });
    }

    if (input.action !== 'inquiry') {
      throw new BadRequestException('Invalid chat action');
    }
    const targetMatches =
      type === 'company'
        ? job.pageId === profileId &&
          job.page?.verificationStatus === 'approved'
        : !job.pageId && job.createdBy === profileId;
    if (!targetMatches || job.createdBy === userId) {
      throw new BadRequestException('Job does not match the selected profile');
    }
    const existing = await this.findContextConversation(
      'inquiry',
      jobId,
      userId,
      job.createdBy,
    );
    if (existing) {
      return this.contextResponse(existing.id, job, job.createdBy, userId);
    }
    const conversation = await this.conversationRepo.manager.transaction(
      async (manager) => {
        const created = await manager.getRepository(ChatConversation).save(
          manager.getRepository(ChatConversation).create({
            type: 'inquiry',
            jobId,
            companyId: job.pageId || null,
            createdByUserId: userId,
            clientRequestId: input.clientRequestId,
            writeState: 'active',
            lastActivityAt: new Date(),
          }),
        );
        await manager.getRepository(ChatParticipant).save(
          [userId, job.createdBy].map((participantUserId) =>
            manager.getRepository(ChatParticipant).create({
              conversationId: created.id,
              userId: participantUserId,
            }),
          ),
        );
        return created;
      },
    );
    return this.contextResponse(conversation.id, job, job.createdBy, userId);
  }

  private async acceptInvitationApplication(
    invitation: JobInvitation,
    manager: EntityManager,
  ) {
    const job = await manager.getRepository(Job).findOne({
      where: { id: invitation.jobId },
      relations: ['page'],
      lock: { mode: 'pessimistic_write' },
    });
    if (
      !job ||
      !job.isActive ||
      job.status !== 'active' ||
      (job.pageId && job.page?.verificationStatus !== 'approved')
    ) {
      throw new BadRequestException('Job is no longer available');
    }
    if (job.vacancies) {
      const occupied = await manager.getRepository(JobApplication).count({
        where: { jobId: job.id, status: In(['accepted', 'completed']) as any },
      });
      if (occupied >= job.vacancies) {
        throw new BadRequestException({
          code: 'APPLICATION_VACANCIES_FILLED',
          message: 'No vacancies remain for this job',
        });
      }
    }
    let application = await manager.getRepository(JobApplication).findOne({
      where: { jobId: job.id, applicantId: invitation.inviteeUserId },
      lock: { mode: 'pessimistic_write' },
    });
    if (application && !['withdrawn', 'rejected'].includes(application.status)) {
      throw new BadRequestException('An active application already exists');
    }
    if (!application) {
      application = manager.getRepository(JobApplication).create({
        jobId: job.id,
        applicantId: invitation.inviteeUserId,
      });
    }
    application.status = 'accepted';
    application.withdrawnAt = null;
    application.completedAt = null;
    application.sourceInvitationId = invitation.id;
    return manager.save(application);
  }

  private async canAccess(conversation: ChatConversation, userId: number) {
    if (conversation.participants?.some((item) => item.userId === userId && item.active)) {
      if (
        conversation.companyId &&
        conversation.application?.applicantId !== userId
      ) {
        return this.companyPermission(
          conversation.companyId,
          userId,
          'chatApplicants',
        );
      }
      return true;
    }
    if (!conversation.companyId) return false;
    return this.companyPermission(
      conversation.companyId,
      userId,
      'chatApplicants',
    );
  }

  private async assertCanMutate(conversation: ChatConversation, userId: number) {
    if (!(await this.canAccess(conversation, userId))) {
      throw new ForbiddenException('You cannot send messages in this chat');
    }
    if (await this.conversationBlocked(conversation, userId)) {
      throw new ForbiddenException({
        code: 'PROFILE_BLOCKED',
        message: 'Messaging is unavailable because of a blocked relationship',
      });
    }
    if (!(await this.isWritable(conversation))) {
      throw new ForbiddenException({
        code: 'CHAT_READ_ONLY',
        message: 'This conversation is read-only',
        details: { reason: conversation.readOnlyReason },
      });
    }
  }

  private async isWritable(conversation: ChatConversation) {
    if (conversation.type === 'application' && conversation.application) {
      return this.applicationWritable(conversation.application.status);
    }
    if (conversation.type === 'inquiry' && conversation.job) {
      return conversation.job.isActive && conversation.job.status === 'active';
    }
    if (conversation.type === 'invitation') {
      const invitation = await this.invitationRepo.findOne({
        where: { conversationId: conversation.id },
      });
      return Boolean(
        invitation && ['pending', 'accepted'].includes(invitation.status),
      );
    }
    return conversation.writeState === 'active';
  }

  private applicationWritable(status: string) {
    return ['pending', 'accepted', 'completed'].includes(status);
  }

  private async conversationBlocked(
    conversation: ChatConversation,
    userId: number,
  ) {
    const other = conversation.participants?.find(
      (item) => item.userId !== userId,
    );
    if (
      other &&
      (await this.moderationService.isInteractionBlocked(
        userId,
        'user',
        other.userId,
      ))
    ) {
      return true;
    }
    if (
      conversation.companyId &&
      conversation.application?.applicantId === userId
    ) {
      return this.moderationService.isInteractionBlocked(
        userId,
        'company',
        conversation.companyId,
      );
    }
    return false;
  }

  private async companyPermission(
    companyId: number,
    userId: number,
    permission: 'chatApplicants' | 'postJobs',
  ) {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company || company.verificationStatus !== 'approved') return false;
    if (company.ownerId === userId) return true;
    const member = await this.pageMemberRepo.findOne({
      where: { pageId: companyId, userId },
    });
    return Boolean(
      member &&
        member.hasAccess !== false &&
        normalizeCompanyPermissions(member.role, member.permissions)[permission],
    );
  }

  private async companyChatIds(userId: number) {
    const memberships = await this.pageMemberRepo.find({
      where: { userId, hasAccess: true },
    });
    const allowed: number[] = [];
    for (const member of memberships) {
      if (
        normalizeCompanyPermissions(member.role, member.permissions)
          .chatApplicants
      ) {
        allowed.push(member.pageId);
      }
    }
    const owned = await this.companyRepo.find({
      where: { ownerId: userId, verificationStatus: 'approved' },
      select: ['id'],
    });
    return [...new Set([...allowed, ...owned.map((item) => item.id)])];
  }

  private async canManageJobForChat(job: Job, userId: number) {
    if (!job.pageId) return job.createdBy === userId;
    return this.companyPermission(job.pageId, userId, 'postJobs');
  }

  private async findManagedActiveJobs(userId: number) {
    const companyIds = await this.companyChatIds(userId);
    const qb = this.jobRepo
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.page', 'page')
      .where('job.isActive = 1')
      .andWhere("COALESCE(job.status, 'active') = 'active'")
      .andWhere(
        new Brackets((where) => {
          where.where('job.createdBy = :userId', { userId });
          if (companyIds.length) {
            where.orWhere('job.pageId IN (:...companyIds)', { companyIds });
          }
        }),
      )
      .orderBy('job.createdAt', 'DESC')
      .take(100);
    const jobs = await qb.getMany();
    const allowed: Job[] = [];
    for (const job of jobs) {
      if (await this.canManageJobForChat(job, userId)) allowed.push(job);
    }
    return allowed;
  }

  private async findContextConversation(
    type: 'inquiry',
    jobId: number,
    userId: number,
    targetUserId: number,
  ) {
    return this.conversationRepo
      .createQueryBuilder('conversation')
      .innerJoin('conversation.participants', 'first', 'first.userId = :userId', {
        userId,
      })
      .innerJoin(
        'conversation.participants',
        'second',
        'second.userId = :targetUserId',
        { targetUserId },
      )
      .where('conversation.type = :type', { type })
      .andWhere('conversation.jobId = :jobId', { jobId })
      .getOne();
  }

  private async recipientIds(
    conversation: ChatConversation,
    senderId: number,
  ) {
    const participants = conversation.participants?.length
      ? conversation.participants
      : await this.participantRepo.find({
          where: { conversationId: conversation.id, active: true },
        });
    return [
      ...new Set(
        participants
          .map((item) => item.userId)
          .filter((userId) => userId !== senderId),
      ),
    ];
  }

  private async formatConversationSummary(
    conversation: ChatConversation,
    userId: number,
  ) {
    const [lastMessage, state, invitation] = await Promise.all([
      this.messageRepo.findOne({
        where: {
          conversationId: conversation.id,
          moderationStatus: 'visible',
        },
        relations: ['sender'],
        order: { id: 'DESC' },
      }),
      this.readRepo.findOne({
        where: { conversationId: conversation.id, userId },
      }),
      conversation.type === 'invitation'
        ? this.invitationRepo.findOne({
            where: { conversationId: conversation.id },
          })
        : Promise.resolve(null),
    ]);
    const unreadCount = await this.messageRepo.count({
      where: {
        conversationId: conversation.id,
        senderId: Not(userId),
        id: MoreThan(state?.lastReadMessageId || 0),
        moderationStatus: 'visible',
      },
    });
    const other = conversation.participants?.find(
      (item) => item.userId !== userId,
    )?.user;
    const isApplicant =
      conversation.application?.applicantId === userId;
    const participant = isApplicant && conversation.companyId
      ? {
          id: conversation.companyId,
          type: 'company',
          name: conversation.job?.page?.company_name || '',
          avatarUrl: conversation.job?.page?.logoAssetId
            ? await this.objectStorageService.getUrl(
                conversation.job.page.logoAssetId,
              )
            : conversation.job?.page?.company_logo || null,
        }
      : {
          id: other?.id,
          type: 'user',
          name: this.userName(other),
          avatarUrl: other?.profilePhotoAssetId
            ? await this.objectStorageService.getUrl(other.profilePhotoAssetId)
            : other?.profile_photo || null,
        };
    const writable = await this.isWritable(conversation);
    return {
      chatId: conversation.id,
      conversationId: conversation.id,
      legacyApplicationChatId: conversation.applicationId || null,
      type: conversation.type,
      jobId: conversation.jobId,
      applicationId: conversation.applicationId,
      participant,
      job: conversation.job
        ? {
            id: conversation.job.id,
            title: conversation.job.title,
            companyName:
              conversation.job.page?.company_name ||
              this.userName(conversation.job.creator),
          }
        : null,
      invitation: invitation
        ? {
            id: invitation.id,
            invitationId: invitation.id,
            status: invitation.status,
            viewerAction: this.invitationViewerAction(invitation, userId),
          }
        : null,
      lastMessage: lastMessage
        ? await this.formatMessage(lastMessage, conversation)
        : null,
      unreadCount,
      readOnly: !writable,
      readOnlyReason: writable ? null : conversation.readOnlyReason,
    };
  }

  private async formatMessage(
    message: ChatMessage,
    conversation: ChatConversation,
  ) {
    return {
      id: message.id,
      chatId: conversation.id,
      conversationId: conversation.id,
      jobApplicationId: conversation.applicationId || message.jobApplicationId,
      clientMessageId: message.clientMessageId || null,
      senderId: message.senderId,
      senderName: this.userName(message.sender),
      senderAvatar: message.sender?.profilePhotoAssetId
        ? await this.objectStorageService.getUrl(
            message.sender.profilePhotoAssetId,
          )
        : message.sender?.profile_photo || null,
      text: message.content || '',
      attachments:
        message.attachments ||
        (message.mediaUrl
          ? [{ fileUrl: message.mediaUrl, contentType: message.messageType }]
          : []),
      messageType: message.messageType,
      createdAt: message.createdAt,
      readAt: message.readAt,
    };
  }

  private async normalizeAttachments(
    conversationId: string,
    senderId: number,
    attachments: MessageInput['attachments'],
  ) {
    const normalized = [];
    for (const attachment of attachments || []) {
      const asset = attachment.assetId
        ? await this.objectStorageService.requireOwnedAsset(
            attachment.assetId,
            senderId,
            'chat-attachments',
          )
        : attachment.fileUrl
          ? await this.objectStorageService.findKnownAssetByUrl(
              attachment.fileUrl,
            )
          : null;

      if (asset) {
        if (
          asset.ownerUserId !== senderId ||
          asset.purpose !== 'chat-attachments' ||
          String(asset.metadata?.conversationId || '') !== conversationId
        ) {
          throw new BadRequestException(
            'Stored attachment does not belong to this conversation',
          );
        }
        if (
          attachment.contentType &&
          attachment.contentType !== asset.contentType
        ) {
          throw new BadRequestException('Attachment metadata does not match');
        }
        normalized.push({
          assetId: asset.id,
          fileUrl: await this.objectStorageService.getUrl(asset),
          fileName: asset.originalName || attachment.fileName,
          contentType: asset.contentType,
          sizeBytes: Number(asset.sizeBytes),
        });
        continue;
      }

      if (
        !attachment.fileUrl ||
        !(await this.isPersistedLegacyAttachment(
          conversationId,
          attachment.fileUrl,
        ))
      ) {
        throw new BadRequestException('Unknown chat attachment');
      }
      normalized.push({
        fileUrl: attachment.fileUrl,
        fileName: attachment.fileName,
        contentType: attachment.contentType,
        sizeBytes: attachment.sizeBytes,
      });
    }
    return normalized;
  }

  private async normalizeLegacyMediaUrl(
    conversationId: string,
    senderId: number,
    fileUrl: string,
  ) {
    const asset = await this.objectStorageService.findKnownAssetByUrl(fileUrl);
    if (asset) {
      if (
        asset.ownerUserId !== senderId ||
        asset.purpose !== 'chat-attachments' ||
        String(asset.metadata?.conversationId || '') !== conversationId
      ) {
        throw new BadRequestException(
          'Stored attachment does not belong to this conversation',
        );
      }
      return this.objectStorageService.getUrl(asset);
    }
    if (await this.isPersistedLegacyAttachment(conversationId, fileUrl)) {
      return fileUrl;
    }
    throw new BadRequestException('Unknown chat attachment');
  }

  private async isPersistedLegacyAttachment(
    conversationId: string,
    fileUrl: string,
  ) {
    const result = await this.messageRepo
      .createQueryBuilder('message')
      .where('message.conversationId = :conversationId', { conversationId })
      .andWhere(
        `(message.mediaUrl = :fileUrl OR JSON_SEARCH(message.attachments, 'one', :fileUrl, NULL, '$[*].fileUrl') IS NOT NULL)`,
        { fileUrl },
      )
      .getOne();
    return Boolean(result);
  }

  private contextResponse(
    conversationId: string,
    job: Job,
    participantUserId: number,
    viewerId: number,
    invitation?: JobInvitation,
  ) {
    return {
      chatId: conversationId,
      conversationId,
      jobId: String(job.id),
      jobTitle: job.title,
      participantId: String(participantUserId),
      invitation: invitation
        ? {
            id: invitation.id,
            invitationId: invitation.id,
            status: invitation.status,
            viewerAction: this.invitationViewerAction(invitation, viewerId),
          }
        : undefined,
    };
  }

  async invitationRealtimePayloads(invitationId: string) {
    const invitation = await this.invitationRepo.findOne({
      where: { id: invitationId },
    });
    if (!invitation) return [];
    return [invitation.inviterUserId, invitation.inviteeUserId].map((userId) => ({
      userId,
      conversationId: invitation.conversationId,
      payload: {
        chatId: invitation.conversationId,
        conversationId: invitation.conversationId,
        invitation: {
          id: invitation.id,
          invitationId: invitation.id,
          status: invitation.status,
          viewerAction: this.invitationViewerAction(invitation, userId),
        },
      },
    }));
  }

  private invitationViewerAction(
    invitation: JobInvitation,
    viewerId: number,
  ): 'respond' | 'cancel' | null {
    if (invitation.status !== 'pending') return null;
    if (invitation.inviteeUserId === viewerId) return 'respond';
    if (invitation.inviterUserId === viewerId) return 'cancel';
    return null;
  }

  private userName(user?: User | null) {
    return (
      user?.full_name ||
      [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
      ''
    );
  }
}
