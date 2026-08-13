"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const idempotency_service_1 = require("../idempotency/idempotency.service");
const job_application_entity_1 = require("../job-application/entities/job-application.entity");
const job_entity_1 = require("../job/entities/job.entity");
const moderation_service_1 = require("../moderation/moderation.service");
const notifications_service_1 = require("../notifications/notifications.service");
const company_permissions_1 = require("../pages/company-permissions");
const company_page_entity_1 = require("../pages/entities/company-page.entity");
const page_member_entity_1 = require("../pages/entities/page-member.entity");
const user_entity_1 = require("../users/entities/user.entity");
const chat_conversation_entity_1 = require("./entities/chat-conversation.entity");
const chat_message_entity_1 = require("./entities/chat-message.entity");
const chat_participant_entity_1 = require("./entities/chat-participant.entity");
const chat_read_state_entity_1 = require("./entities/chat-read-state.entity");
const job_invitation_entity_1 = require("./entities/job-invitation.entity");
const object_storage_service_1 = require("../storage/object-storage.service");
let ChatService = class ChatService {
    constructor(messageRepo, conversationRepo, participantRepo, readRepo, invitationRepo, appRepo, jobRepo, userRepo, pageMemberRepo, companyRepo, notificationsService, moderationService, idempotencyService, objectStorageService) {
        this.messageRepo = messageRepo;
        this.conversationRepo = conversationRepo;
        this.participantRepo = participantRepo;
        this.readRepo = readRepo;
        this.invitationRepo = invitationRepo;
        this.appRepo = appRepo;
        this.jobRepo = jobRepo;
        this.userRepo = userRepo;
        this.pageMemberRepo = pageMemberRepo;
        this.companyRepo = companyRepo;
        this.notificationsService = notificationsService;
        this.moderationService = moderationService;
        this.idempotencyService = idempotencyService;
        this.objectStorageService = objectStorageService;
    }
    async ensureApplicationConversation(applicationId, manager = this.conversationRepo.manager) {
        const conversations = manager.getRepository(chat_conversation_entity_1.ChatConversation);
        const existing = await conversations.findOne({
            where: { applicationId },
            relations: ['job', 'job.page', 'application', 'application.applicant', 'participants'],
        });
        if (existing)
            return existing;
        const application = await manager.getRepository(job_application_entity_1.JobApplication).findOne({
            where: { id: applicationId },
            relations: ['job', 'job.page', 'job.creator', 'applicant'],
        });
        if (!application)
            throw new common_1.NotFoundException('Job application not found');
        const conversation = await conversations.save(conversations.create({
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
        }));
        const participantIds = [
            ...new Set([application.applicantId, application.job.createdBy]),
        ];
        await manager.getRepository(chat_participant_entity_1.ChatParticipant).save(participantIds.map((userId) => manager.getRepository(chat_participant_entity_1.ChatParticipant).create({
            conversationId: conversation.id,
            userId,
            active: true,
        })));
        return conversations.findOne({
            where: { id: conversation.id },
            relations: ['job', 'job.page', 'job.creator', 'application', 'application.applicant', 'participants'],
        });
    }
    async resolveConversation(reference) {
        const value = String(reference || '').trim();
        if (!value)
            throw new common_1.NotFoundException('Chat not found');
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
        if (!conversation)
            throw new common_1.NotFoundException('Chat not found');
        return conversation;
    }
    async userCanAccessApplication(userId, applicationId) {
        try {
            const conversation = await this.ensureApplicationConversation(applicationId);
            return this.canAccess(conversation, userId);
        }
        catch {
            return false;
        }
    }
    async canWriteConversation(userId, reference) {
        const conversation = await this.resolveConversation(reference);
        await this.assertCanMutate(conversation, userId);
        return true;
    }
    async assertCanJoinConversation(userId, reference) {
        const conversation = await this.resolveConversation(reference);
        if (!(await this.canAccess(conversation, userId))) {
            throw new common_1.ForbiddenException('You cannot view this chat');
        }
        if (await this.conversationBlocked(conversation, userId)) {
            throw new common_1.ForbiddenException({
                code: 'PROFILE_BLOCKED',
                message: 'This conversation is unavailable because of a blocked relationship',
            });
        }
        return conversation;
    }
    async realtimeAudienceIds(reference) {
        const conversation = await this.resolveConversation(reference);
        const participants = conversation.participants?.length
            ? conversation.participants
            : await this.participantRepo.find({
                where: { conversationId: conversation.id, active: true },
            });
        return {
            conversationId: conversation.id,
            userIds: [
                ...new Set(participants
                    .filter((participant) => participant.active !== false)
                    .map((participant) => participant.userId)),
            ],
        };
    }
    async listChats(userId, page = 1, limit = 20) {
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
            .where(new typeorm_2.Brackets((where) => {
            where.where('participant.userId = :userId', { userId });
            if (companyIds.length) {
                where.orWhere('conversation.companyId IN (:...companyIds)', {
                    companyIds,
                });
            }
        }))
            .distinct(true)
            .orderBy('conversation.lastActivityAt', 'DESC')
            .addOrderBy('conversation.createdAt', 'DESC');
        const candidates = await qb.getMany();
        const visible = [];
        for (const conversation of candidates) {
            if (!(await this.canAccess(conversation, userId)))
                continue;
            if (await this.conversationBlocked(conversation, userId))
                continue;
            visible.push(conversation);
        }
        const pageItems = visible.slice((currentPage - 1) * take, currentPage * take);
        return {
            data: await Promise.all(pageItems.map((conversation) => this.formatConversationSummary(conversation, userId))),
            total: visible.length,
            totalPages: Math.ceil(visible.length / take),
            currentPage,
        };
    }
    async getMessages(reference, userId, pageOrBefore = 1, limit = 20) {
        const conversation = await this.resolveConversation(reference);
        if (!(await this.canAccess(conversation, userId))) {
            throw new common_1.ForbiddenException('You cannot view this chat');
        }
        const take = Math.min(100, Math.max(1, Number(limit) || 20));
        const before = typeof pageOrBefore === 'string' && pageOrBefore
            ? Number(pageOrBefore)
            : undefined;
        const page = typeof pageOrBefore === 'number'
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
        }
        else if (page > 1) {
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
            data: await Promise.all(pageItems.map((message) => this.formatMessage(message, conversation))),
            nextBefore: hasMore && pageItems.length ? String(pageItems[0].id) : null,
            total,
            totalPages: Math.ceil(total / take),
            currentPage: page,
            readOnly: !(await this.isWritable(conversation)),
            readOnlyReason: conversation.readOnlyReason || null,
        };
    }
    async sendMessage(senderId, input) {
        const reference = 'conversationId' in input
            ? input.conversationId
            : input.jobApplicationId;
        const conversation = await this.resolveConversation(reference);
        await this.assertCanMutate(conversation, senderId);
        const text = String(input.content ?? input.text ?? '').trim();
        const attachments = await this.normalizeAttachments(conversation.id, senderId, input.attachments || []);
        const mediaUrl = input.mediaUrl
            ? await this.normalizeLegacyMediaUrl(conversation.id, senderId, input.mediaUrl)
            : null;
        const type = input.messageType ||
            (attachments.length || mediaUrl ? 'file' : 'text');
        if (!text && !attachments.length && !mediaUrl) {
            throw new common_1.BadRequestException('A message needs text or an attachment');
        }
        if (text.length > 2000) {
            throw new common_1.BadRequestException('Message cannot exceed 2000 characters');
        }
        const clientMessageId = String(input.clientMessageId || '').trim() || null;
        if (clientMessageId) {
            const existing = await this.messageRepo.findOne({
                where: { conversationId: conversation.id, senderId, clientMessageId },
                relations: ['sender'],
            });
            if (existing)
                return this.formatMessage(existing, conversation);
        }
        const message = await this.messageRepo.save(this.messageRepo.create({
            conversationId: conversation.id,
            jobApplicationId: conversation.applicationId || null,
            senderId,
            clientMessageId,
            content: text || null,
            mediaUrl,
            attachments: attachments.length ? attachments : null,
            messageType: type,
        }));
        conversation.lastActivityAt = message.createdAt || new Date();
        await this.conversationRepo.save(conversation);
        const saved = await this.messageRepo.findOne({
            where: { id: message.id },
            relations: ['sender'],
        });
        const formatted = await this.formatMessage(saved, conversation);
        const recipients = await this.recipientIds(conversation, senderId);
        await Promise.all(recipients.map((userId) => this.notificationsService.create({
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
        })));
        return formatted;
    }
    async markRead(reference, userId) {
        const conversation = await this.resolveConversation(reference);
        if (!(await this.canAccess(conversation, userId))) {
            throw new common_1.ForbiddenException('You cannot update this chat');
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
            await this.messageRepo.update({
                conversationId: conversation.id,
                senderId: (0, typeorm_2.Not)(userId),
                readAt: (0, typeorm_2.IsNull)(),
            }, { readAt: state.readAt });
        }
        return {
            chatId: conversation.id,
            conversationId: conversation.id,
            lastReadMessageId: state.lastReadMessageId,
            readAt: state.readAt,
        };
    }
    async getReportableMessage(reference, messageId, userId) {
        const conversation = await this.resolveConversation(reference);
        if (!(await this.canAccess(conversation, userId))) {
            throw new common_1.ForbiddenException('You cannot view this chat');
        }
        const message = await this.messageRepo.findOne({
            where: { id: messageId, conversationId: conversation.id },
            relations: ['sender'],
        });
        if (!message ||
            (message.moderationStatus && message.moderationStatus !== 'visible')) {
            throw new common_1.NotFoundException('Chat message not found');
        }
        return {
            targetType: 'chat_message',
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
    async getChatOptions(viewerId, profileType, profileId) {
        const type = this.moderationService.parseProfileType(profileType);
        await this.moderationService.assertInteractionAllowed(viewerId, type, profileId);
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
                throw new common_1.NotFoundException('Profile not found');
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
            where: { createdBy: profileId, pageId: (0, typeorm_2.IsNull)(), isActive: true, status: 'active' },
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
    async createContext(userId, input) {
        return this.idempotencyService.execute(userId, 'chat_context', input.clientRequestId, input, () => this.createContextInternal(userId, input));
    }
    async updateInvitation(invitationId, userId, action) {
        return this.invitationRepo.manager.transaction(async (manager) => {
            const invitation = await manager.getRepository(job_invitation_entity_1.JobInvitation).findOne({
                where: { id: invitationId },
                relations: ['conversation', 'job', 'job.page'],
                lock: { mode: 'pessimistic_write' },
            });
            if (!invitation)
                throw new common_1.NotFoundException('Job invitation not found');
            if (invitation.status !== 'pending') {
                throw new common_1.BadRequestException('Invitation is no longer pending');
            }
            if (action === 'cancel') {
                if (invitation.inviterUserId !== userId) {
                    throw new common_1.ForbiddenException('Only the inviter can cancel this invitation');
                }
                invitation.status = 'cancelled';
            }
            else {
                if (invitation.inviteeUserId !== userId) {
                    throw new common_1.ForbiddenException('Only the invited user can respond');
                }
                invitation.status = action === 'accept' ? 'accepted' : 'declined';
            }
            invitation.respondedAt = new Date();
            let application = null;
            if (action === 'accept') {
                application = await this.acceptInvitationApplication(invitation, manager);
                invitation.conversation.applicationId = application.id;
                invitation.conversation.type = 'application';
                invitation.conversation.writeState = 'active';
                invitation.conversation.readOnlyReason = null;
            }
            else {
                invitation.conversation.writeState = 'read_only';
                invitation.conversation.readOnlyReason = `invitation_${invitation.status}`;
            }
            await manager.save(invitation.conversation);
            await manager.save(invitation);
            await this.notificationsService.create({
                userId: userId === invitation.inviterUserId
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
    async syncApplicationConversation(applicationId, status) {
        const conversation = await this.conversationRepo.findOne({
            where: { applicationId },
        });
        if (!conversation)
            return;
        conversation.writeState = this.applicationWritable(status)
            ? 'active'
            : 'read_only';
        conversation.readOnlyReason = this.applicationWritable(status)
            ? null
            : `application_${status}`;
        await this.conversationRepo.save(conversation);
    }
    formatUploadedAttachment(file, fileUrl) {
        return {
            fileName: file.filename,
            fileUrl,
            contentType: file.mimetype,
        };
    }
    async createContextInternal(userId, input) {
        const type = this.moderationService.parseProfileType(input.profileType);
        const profileId = Number(input.profileId);
        const jobId = Number(input.jobId);
        if (!Number.isInteger(profileId) || !Number.isInteger(jobId)) {
            throw new common_1.BadRequestException('Invalid profile or job ID');
        }
        await this.moderationService.assertInteractionAllowed(userId, type, profileId);
        const job = await this.jobRepo.findOne({
            where: { id: jobId },
            relations: ['page', 'creator'],
        });
        if (!job || !job.isActive || job.status !== 'active') {
            throw new common_1.BadRequestException('Job is not active');
        }
        if (input.action === 'invite') {
            if (type !== 'user' || profileId === userId) {
                throw new common_1.BadRequestException('Invitations require another user profile');
            }
            if (!(await this.canManageJobForChat(job, userId))) {
                throw new common_1.ForbiddenException('You cannot invite workers to this job');
            }
            const duplicate = await this.invitationRepo.findOne({
                where: { jobId, inviteeUserId: profileId, status: 'pending' },
            });
            if (duplicate) {
                return this.contextResponse(duplicate.conversationId, job, profileId, userId, duplicate);
            }
            return this.conversationRepo.manager.transaction(async (manager) => {
                const conversation = await manager.getRepository(chat_conversation_entity_1.ChatConversation).save(manager.getRepository(chat_conversation_entity_1.ChatConversation).create({
                    type: 'invitation',
                    jobId,
                    companyId: job.pageId || null,
                    createdByUserId: userId,
                    clientRequestId: input.clientRequestId,
                    writeState: 'active',
                    lastActivityAt: new Date(),
                }));
                await manager.getRepository(chat_participant_entity_1.ChatParticipant).save([userId, profileId].map((participantUserId) => manager.getRepository(chat_participant_entity_1.ChatParticipant).create({
                    conversationId: conversation.id,
                    userId: participantUserId,
                })));
                const invitation = await manager.getRepository(job_invitation_entity_1.JobInvitation).save(manager.getRepository(job_invitation_entity_1.JobInvitation).create({
                    conversationId: conversation.id,
                    jobId,
                    inviterUserId: userId,
                    inviteeUserId: profileId,
                    status: 'pending',
                    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                    clientRequestId: input.clientRequestId,
                }));
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
                return this.contextResponse(conversation.id, job, profileId, userId, invitation);
            });
        }
        if (input.action !== 'inquiry') {
            throw new common_1.BadRequestException('Invalid chat action');
        }
        const targetMatches = type === 'company'
            ? job.pageId === profileId &&
                job.page?.verificationStatus === 'approved'
            : !job.pageId && job.createdBy === profileId;
        if (!targetMatches || job.createdBy === userId) {
            throw new common_1.BadRequestException('Job does not match the selected profile');
        }
        const existing = await this.findContextConversation('inquiry', jobId, userId, job.createdBy);
        if (existing) {
            return this.contextResponse(existing.id, job, job.createdBy, userId);
        }
        const conversation = await this.conversationRepo.manager.transaction(async (manager) => {
            const created = await manager.getRepository(chat_conversation_entity_1.ChatConversation).save(manager.getRepository(chat_conversation_entity_1.ChatConversation).create({
                type: 'inquiry',
                jobId,
                companyId: job.pageId || null,
                createdByUserId: userId,
                clientRequestId: input.clientRequestId,
                writeState: 'active',
                lastActivityAt: new Date(),
            }));
            await manager.getRepository(chat_participant_entity_1.ChatParticipant).save([userId, job.createdBy].map((participantUserId) => manager.getRepository(chat_participant_entity_1.ChatParticipant).create({
                conversationId: created.id,
                userId: participantUserId,
            })));
            return created;
        });
        return this.contextResponse(conversation.id, job, job.createdBy, userId);
    }
    async acceptInvitationApplication(invitation, manager) {
        const job = await manager.getRepository(job_entity_1.Job).findOne({
            where: { id: invitation.jobId },
            relations: ['page'],
            lock: { mode: 'pessimistic_write' },
        });
        if (!job ||
            !job.isActive ||
            job.status !== 'active' ||
            (job.pageId && job.page?.verificationStatus !== 'approved')) {
            throw new common_1.BadRequestException('Job is no longer available');
        }
        if (job.vacancies) {
            const occupied = await manager.getRepository(job_application_entity_1.JobApplication).count({
                where: { jobId: job.id, status: (0, typeorm_2.In)(['accepted', 'completed']) },
            });
            if (occupied >= job.vacancies) {
                throw new common_1.BadRequestException({
                    code: 'APPLICATION_VACANCIES_FILLED',
                    message: 'No vacancies remain for this job',
                });
            }
        }
        let application = await manager.getRepository(job_application_entity_1.JobApplication).findOne({
            where: { jobId: job.id, applicantId: invitation.inviteeUserId },
            lock: { mode: 'pessimistic_write' },
        });
        if (application && !['withdrawn', 'rejected'].includes(application.status)) {
            throw new common_1.BadRequestException('An active application already exists');
        }
        if (!application) {
            application = manager.getRepository(job_application_entity_1.JobApplication).create({
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
    async canAccess(conversation, userId) {
        if (conversation.participants?.some((item) => item.userId === userId && item.active)) {
            if (conversation.companyId &&
                conversation.application?.applicantId !== userId) {
                return this.companyPermission(conversation.companyId, userId, 'chatApplicants');
            }
            return true;
        }
        if (!conversation.companyId)
            return false;
        return this.companyPermission(conversation.companyId, userId, 'chatApplicants');
    }
    async assertCanMutate(conversation, userId) {
        if (!(await this.canAccess(conversation, userId))) {
            throw new common_1.ForbiddenException('You cannot send messages in this chat');
        }
        if (await this.conversationBlocked(conversation, userId)) {
            throw new common_1.ForbiddenException({
                code: 'PROFILE_BLOCKED',
                message: 'Messaging is unavailable because of a blocked relationship',
            });
        }
        if (!(await this.isWritable(conversation))) {
            throw new common_1.ForbiddenException({
                code: 'CHAT_READ_ONLY',
                message: 'This conversation is read-only',
                details: { reason: conversation.readOnlyReason },
            });
        }
    }
    async isWritable(conversation) {
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
            return Boolean(invitation && ['pending', 'accepted'].includes(invitation.status));
        }
        return conversation.writeState === 'active';
    }
    applicationWritable(status) {
        return ['pending', 'accepted', 'completed'].includes(status);
    }
    async conversationBlocked(conversation, userId) {
        const other = conversation.participants?.find((item) => item.userId !== userId);
        if (other &&
            (await this.moderationService.isInteractionBlocked(userId, 'user', other.userId))) {
            return true;
        }
        if (conversation.companyId &&
            conversation.application?.applicantId === userId) {
            return this.moderationService.isInteractionBlocked(userId, 'company', conversation.companyId);
        }
        return false;
    }
    async companyPermission(companyId, userId, permission) {
        const company = await this.companyRepo.findOne({ where: { id: companyId } });
        if (!company || company.verificationStatus !== 'approved')
            return false;
        if (company.ownerId === userId)
            return true;
        const member = await this.pageMemberRepo.findOne({
            where: { pageId: companyId, userId },
        });
        return Boolean(member &&
            member.hasAccess !== false &&
            (0, company_permissions_1.normalizeCompanyPermissions)(member.role, member.permissions)[permission]);
    }
    async companyChatIds(userId) {
        const memberships = await this.pageMemberRepo.find({
            where: { userId, hasAccess: true },
        });
        const allowed = [];
        for (const member of memberships) {
            if ((0, company_permissions_1.normalizeCompanyPermissions)(member.role, member.permissions)
                .chatApplicants) {
                allowed.push(member.pageId);
            }
        }
        const owned = await this.companyRepo.find({
            where: { ownerId: userId, verificationStatus: 'approved' },
            select: ['id'],
        });
        return [...new Set([...allowed, ...owned.map((item) => item.id)])];
    }
    async canManageJobForChat(job, userId) {
        if (!job.pageId)
            return job.createdBy === userId;
        return this.companyPermission(job.pageId, userId, 'postJobs');
    }
    async findManagedActiveJobs(userId) {
        const companyIds = await this.companyChatIds(userId);
        const qb = this.jobRepo
            .createQueryBuilder('job')
            .leftJoinAndSelect('job.page', 'page')
            .where('job.isActive = 1')
            .andWhere("COALESCE(job.status, 'active') = 'active'")
            .andWhere(new typeorm_2.Brackets((where) => {
            where.where('job.createdBy = :userId', { userId });
            if (companyIds.length) {
                where.orWhere('job.pageId IN (:...companyIds)', { companyIds });
            }
        }))
            .orderBy('job.createdAt', 'DESC')
            .take(100);
        const jobs = await qb.getMany();
        const allowed = [];
        for (const job of jobs) {
            if (await this.canManageJobForChat(job, userId))
                allowed.push(job);
        }
        return allowed;
    }
    async findContextConversation(type, jobId, userId, targetUserId) {
        return this.conversationRepo
            .createQueryBuilder('conversation')
            .innerJoin('conversation.participants', 'first', 'first.userId = :userId', {
            userId,
        })
            .innerJoin('conversation.participants', 'second', 'second.userId = :targetUserId', { targetUserId })
            .where('conversation.type = :type', { type })
            .andWhere('conversation.jobId = :jobId', { jobId })
            .getOne();
    }
    async recipientIds(conversation, senderId) {
        const participants = conversation.participants?.length
            ? conversation.participants
            : await this.participantRepo.find({
                where: { conversationId: conversation.id, active: true },
            });
        return [
            ...new Set(participants
                .map((item) => item.userId)
                .filter((userId) => userId !== senderId)),
        ];
    }
    async formatConversationSummary(conversation, userId) {
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
                senderId: (0, typeorm_2.Not)(userId),
                id: (0, typeorm_2.MoreThan)(state?.lastReadMessageId || 0),
                moderationStatus: 'visible',
            },
        });
        const other = conversation.participants?.find((item) => item.userId !== userId)?.user;
        const isApplicant = conversation.application?.applicantId === userId;
        const participant = isApplicant && conversation.companyId
            ? {
                id: conversation.companyId,
                type: 'company',
                name: conversation.job?.page?.company_name || '',
                avatarUrl: conversation.job?.page?.logoAssetId
                    ? await this.objectStorageService.getUrl(conversation.job.page.logoAssetId)
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
                    companyName: conversation.job.page?.company_name ||
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
    async formatMessage(message, conversation) {
        return {
            id: message.id,
            chatId: conversation.id,
            conversationId: conversation.id,
            jobApplicationId: conversation.applicationId || message.jobApplicationId,
            clientMessageId: message.clientMessageId || null,
            senderId: message.senderId,
            senderName: this.userName(message.sender),
            senderAvatar: message.sender?.profilePhotoAssetId
                ? await this.objectStorageService.getUrl(message.sender.profilePhotoAssetId)
                : message.sender?.profile_photo || null,
            text: message.content || '',
            attachments: message.attachments ||
                (message.mediaUrl
                    ? [{ fileUrl: message.mediaUrl, contentType: message.messageType }]
                    : []),
            messageType: message.messageType,
            createdAt: message.createdAt,
            readAt: message.readAt,
        };
    }
    async normalizeAttachments(conversationId, senderId, attachments) {
        const normalized = [];
        for (const attachment of attachments || []) {
            const asset = attachment.assetId
                ? await this.objectStorageService.requireOwnedAsset(attachment.assetId, senderId, 'chat-attachments')
                : attachment.fileUrl
                    ? await this.objectStorageService.findKnownAssetByUrl(attachment.fileUrl)
                    : null;
            if (asset) {
                if (asset.ownerUserId !== senderId ||
                    asset.purpose !== 'chat-attachments' ||
                    String(asset.metadata?.conversationId || '') !== conversationId) {
                    throw new common_1.BadRequestException('Stored attachment does not belong to this conversation');
                }
                if (attachment.contentType &&
                    attachment.contentType !== asset.contentType) {
                    throw new common_1.BadRequestException('Attachment metadata does not match');
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
            if (!attachment.fileUrl ||
                !(await this.isPersistedLegacyAttachment(conversationId, attachment.fileUrl))) {
                throw new common_1.BadRequestException('Unknown chat attachment');
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
    async normalizeLegacyMediaUrl(conversationId, senderId, fileUrl) {
        const asset = await this.objectStorageService.findKnownAssetByUrl(fileUrl);
        if (asset) {
            if (asset.ownerUserId !== senderId ||
                asset.purpose !== 'chat-attachments' ||
                String(asset.metadata?.conversationId || '') !== conversationId) {
                throw new common_1.BadRequestException('Stored attachment does not belong to this conversation');
            }
            return this.objectStorageService.getUrl(asset);
        }
        if (await this.isPersistedLegacyAttachment(conversationId, fileUrl)) {
            return fileUrl;
        }
        throw new common_1.BadRequestException('Unknown chat attachment');
    }
    async isPersistedLegacyAttachment(conversationId, fileUrl) {
        const result = await this.messageRepo
            .createQueryBuilder('message')
            .where('message.conversationId = :conversationId', { conversationId })
            .andWhere(`(message.mediaUrl = :fileUrl OR JSON_SEARCH(message.attachments, 'one', :fileUrl, NULL, '$[*].fileUrl') IS NOT NULL)`, { fileUrl })
            .getOne();
        return Boolean(result);
    }
    contextResponse(conversationId, job, participantUserId, viewerId, invitation) {
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
    async invitationRealtimePayloads(invitationId) {
        const invitation = await this.invitationRepo.findOne({
            where: { id: invitationId },
        });
        if (!invitation)
            return [];
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
    invitationViewerAction(invitation, viewerId) {
        if (invitation.status !== 'pending')
            return null;
        if (invitation.inviteeUserId === viewerId)
            return 'respond';
        if (invitation.inviterUserId === viewerId)
            return 'cancel';
        return null;
    }
    userName(user) {
        return (user?.full_name ||
            [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
            '');
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(chat_message_entity_1.ChatMessage)),
    __param(1, (0, typeorm_1.InjectRepository)(chat_conversation_entity_1.ChatConversation)),
    __param(2, (0, typeorm_1.InjectRepository)(chat_participant_entity_1.ChatParticipant)),
    __param(3, (0, typeorm_1.InjectRepository)(chat_read_state_entity_1.ChatReadState)),
    __param(4, (0, typeorm_1.InjectRepository)(job_invitation_entity_1.JobInvitation)),
    __param(5, (0, typeorm_1.InjectRepository)(job_application_entity_1.JobApplication)),
    __param(6, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(7, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(8, (0, typeorm_1.InjectRepository)(page_member_entity_1.PageMember)),
    __param(9, (0, typeorm_1.InjectRepository)(company_page_entity_1.CompanyPage)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        notifications_service_1.NotificationsService,
        moderation_service_1.ModerationService,
        idempotency_service_1.IdempotencyService,
        object_storage_service_1.ObjectStorageService])
], ChatService);
//# sourceMappingURL=chat.service.js.map