// src/chat/chat.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatMessage } from './entities/chat-message.entity';
import { PageMember } from 'src/pages/entities/page-member.entity';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,

    @InjectRepository(JobApplication)
    private readonly appRepo: Repository<JobApplication>,

    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(PageMember)
    private readonly pageMemberRepo: Repository<PageMember>,

    private readonly notificationsService: NotificationsService,
  ) {}

  async userCanAccessApplication(
    userId: number,
    appId: number,
  ): Promise<boolean> {
    const app = await this.appRepo.findOne({
      where: { id: appId },
      relations: ['job'],
    });

    if (!app) return false;
    if (app.applicantId === userId || app.job.createdBy === userId) return true;
    if (!app.job.pageId) return false;

    const member = await this.pageMemberRepo.findOne({
      where: { pageId: app.job.pageId, userId },
    });
    if (!member || member.hasAccess === false) return false;

    const permissions = {
      chatApplicants: true,
      ...(member.permissions || {}),
    };

    return Boolean(permissions.chatApplicants);
  }

  async listChats(userId: number, page = 1, limit = 20) {
    const currentPage = Math.max(1, Number(page) || 1);
    const take = Math.min(100, Math.max(1, Number(limit) || 20));

    const qb = this.appRepo
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.job', 'job')
      .leftJoinAndSelect('job.page', 'page')
      .leftJoinAndSelect('job.creator', 'creator')
      .leftJoinAndSelect('application.applicant', 'applicant')
      .leftJoin('page.members', 'member')
      .where('application.applicantId = :userId', { userId })
      .orWhere('job.createdBy = :userId', { userId })
      .orWhere('member.userId = :userId', { userId })
      .orderBy('application.updatedAt', 'DESC')
      .skip((currentPage - 1) * take)
      .take(take);

    const [applications, total] = await qb.getManyAndCount();

    const data = await Promise.all(
      applications.map((application) => this.formatChatSummary(application, userId)),
    );

    return {
      data,
      total,
      totalPages: Math.ceil(total / take),
      currentPage,
    };
  }

  async sendMessage(senderId: number, dto: SendMessageDto & any) {
    const { jobApplicationId, content, mediaUrl, messageType, attachments } = dto;

    const app = await this.appRepo.findOne({
      where: { id: jobApplicationId },
      relations: ['job', 'job.page', 'job.creator', 'applicant'],
    });

    if (!app) throw new NotFoundException('Job application not found');

    const allowed = await this.userCanAccessApplication(senderId, jobApplicationId);
    if (!allowed)
      throw new ForbiddenException('You cannot chat on this application');

    const normalizedType = messageType || (attachments?.length ? 'file' : 'text');
    if (normalizedType === 'text' && !content) {
      throw new BadRequestException('Text messages must include content');
    }

    if (normalizedType !== 'text' && !mediaUrl && !attachments?.length) {
      throw new BadRequestException('Media messages must include mediaUrl or attachments');
    }

    const msg = this.messageRepo.create({
      jobApplicationId,
      senderId,
      content: content || null,
      mediaUrl: mediaUrl || null,
      attachments: attachments || null,
      messageType: normalizedType,
    });

    await this.messageRepo.save(msg);

    const saved = await this.messageRepo.findOne({
      where: { id: msg.id },
      relations: ['sender'],
    });

    const recipientId =
      senderId === app.applicantId ? app.job.createdBy : app.applicantId;
    if (recipientId && recipientId !== senderId) {
      await this.notificationsService.create({
        userId: recipientId,
        type: 'chat_message',
        title: 'New message',
        message: content || 'You received a new attachment.',
        data: {
          chatId: app.id,
          applicationId: app.id,
          jobId: app.jobId,
          companyId: app.job.pageId ?? null,
        },
      });
    }

    return this.formatMessage(saved);
  }

  async getMessages(
    jobApplicationId: number,
    userId: number,
    page = 1,
    limit = 20,
  ) {
    const allowed = await this.userCanAccessApplication(userId, jobApplicationId);
    if (!allowed) throw new ForbiddenException('You cannot view this chat');

    const currentPage = Math.max(1, Number(page) || 1);
    const take = Math.min(100, Math.max(1, Number(limit) || 20));

    const [data, total] = await this.messageRepo.findAndCount({
      where: { jobApplicationId },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
      skip: (currentPage - 1) * take,
      take,
    });

    return {
      data: data.map((message) => this.formatMessage(message)),
      total,
      totalPages: Math.ceil(total / take),
      currentPage,
    };
  }

  async markRead(jobApplicationId: number, userId: number) {
    const allowed = await this.userCanAccessApplication(userId, jobApplicationId);
    if (!allowed) throw new ForbiddenException('You cannot update this chat');

    await this.messageRepo.update(
      {
        jobApplicationId,
        senderId: Not(userId),
        readAt: IsNull(),
      },
      { readAt: new Date() },
    );

    return { message: 'Chat marked as read' };
  }

  formatUploadedAttachment(file: Express.Multer.File, fileUrl: string) {
    return {
      fileName: file.filename,
      fileUrl,
      contentType: file.mimetype,
    };
  }

  private async formatChatSummary(application: JobApplication, userId: number) {
    const [lastMessage, unreadCount] = await Promise.all([
      this.messageRepo.findOne({
        where: { jobApplicationId: application.id },
        relations: ['sender'],
        order: { createdAt: 'DESC' },
      }),
      this.messageRepo.count({
        where: {
          jobApplicationId: application.id,
          senderId: Not(userId),
          readAt: IsNull(),
        },
      }),
    ]);

    const participant =
      application.applicantId === userId
        ? application.job.creator
        : application.applicant;
    const participantName =
      participant?.full_name ||
      [participant?.firstName, participant?.lastName].filter(Boolean).join(' ');

    return {
      chatId: application.id,
      jobId: application.jobId,
      applicationId: application.id,
      participant: {
        id: participant?.id,
        name: participantName || '',
        avatarUrl: participant?.profile_photo || null,
      },
      job: {
        id: application.job?.id,
        title: application.job?.title,
        companyName: application.job?.page?.company_name || participantName || '',
      },
      lastMessage: lastMessage ? this.formatMessage(lastMessage) : null,
      unreadCount,
    };
  }

  private formatMessage(message: ChatMessage | null) {
    if (!message) return null;

    const senderName =
      message.sender?.full_name ||
      [message.sender?.firstName, message.sender?.lastName]
        .filter(Boolean)
        .join(' ');

    return {
      id: message.id,
      chatId: message.jobApplicationId,
      jobApplicationId: message.jobApplicationId,
      senderId: message.senderId,
      senderName: senderName || '',
      senderAvatar: message.sender?.profile_photo || null,
      text: message.content || '',
      attachments:
        message.attachments ||
        (message.mediaUrl
          ? [
              {
                fileUrl: message.mediaUrl,
                contentType: message.messageType,
              },
            ]
          : []),
      messageType: message.messageType,
      createdAt: message.createdAt,
      readAt: message.readAt,
    };
  }
}
