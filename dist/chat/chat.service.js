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
const job_application_entity_1 = require("../job-application/entities/job-application.entity");
const job_entity_1 = require("../job/entities/job.entity");
const user_entity_1 = require("../users/entities/user.entity");
const chat_message_entity_1 = require("./entities/chat-message.entity");
const page_member_entity_1 = require("../pages/entities/page-member.entity");
const notifications_service_1 = require("../notifications/notifications.service");
let ChatService = class ChatService {
    constructor(messageRepo, appRepo, jobRepo, userRepo, pageMemberRepo, notificationsService) {
        this.messageRepo = messageRepo;
        this.appRepo = appRepo;
        this.jobRepo = jobRepo;
        this.userRepo = userRepo;
        this.pageMemberRepo = pageMemberRepo;
        this.notificationsService = notificationsService;
    }
    async userCanAccessApplication(userId, appId) {
        const app = await this.appRepo.findOne({
            where: { id: appId },
            relations: ['job'],
        });
        if (!app)
            return false;
        if (app.applicantId === userId || app.job.createdBy === userId)
            return true;
        if (!app.job.pageId)
            return false;
        const member = await this.pageMemberRepo.findOne({
            where: { pageId: app.job.pageId, userId },
        });
        if (!member || member.hasAccess === false)
            return false;
        const permissions = {
            chatApplicants: true,
            ...(member.permissions || {}),
        };
        return Boolean(permissions.chatApplicants);
    }
    async listChats(userId, page = 1, limit = 20) {
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
        const data = await Promise.all(applications.map((application) => this.formatChatSummary(application, userId)));
        return {
            data,
            total,
            totalPages: Math.ceil(total / take),
            currentPage,
        };
    }
    async sendMessage(senderId, dto) {
        const { jobApplicationId, content, mediaUrl, messageType, attachments } = dto;
        const app = await this.appRepo.findOne({
            where: { id: jobApplicationId },
            relations: ['job', 'job.page', 'job.creator', 'applicant'],
        });
        if (!app)
            throw new common_1.NotFoundException('Job application not found');
        const allowed = await this.userCanAccessApplication(senderId, jobApplicationId);
        if (!allowed)
            throw new common_1.ForbiddenException('You cannot chat on this application');
        const normalizedType = messageType || (attachments?.length ? 'file' : 'text');
        if (normalizedType === 'text' && !content) {
            throw new common_1.BadRequestException('Text messages must include content');
        }
        if (normalizedType !== 'text' && !mediaUrl && !attachments?.length) {
            throw new common_1.BadRequestException('Media messages must include mediaUrl or attachments');
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
        const recipientId = senderId === app.applicantId ? app.job.createdBy : app.applicantId;
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
    async getMessages(jobApplicationId, userId, page = 1, limit = 20) {
        const allowed = await this.userCanAccessApplication(userId, jobApplicationId);
        if (!allowed)
            throw new common_1.ForbiddenException('You cannot view this chat');
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
    async markRead(jobApplicationId, userId) {
        const allowed = await this.userCanAccessApplication(userId, jobApplicationId);
        if (!allowed)
            throw new common_1.ForbiddenException('You cannot update this chat');
        await this.messageRepo.update({
            jobApplicationId,
            senderId: (0, typeorm_2.Not)(userId),
            readAt: (0, typeorm_2.IsNull)(),
        }, { readAt: new Date() });
        return { message: 'Chat marked as read' };
    }
    formatUploadedAttachment(file, fileUrl) {
        return {
            fileName: file.filename,
            fileUrl,
            contentType: file.mimetype,
        };
    }
    async formatChatSummary(application, userId) {
        const [lastMessage, unreadCount] = await Promise.all([
            this.messageRepo.findOne({
                where: { jobApplicationId: application.id },
                relations: ['sender'],
                order: { createdAt: 'DESC' },
            }),
            this.messageRepo.count({
                where: {
                    jobApplicationId: application.id,
                    senderId: (0, typeorm_2.Not)(userId),
                    readAt: (0, typeorm_2.IsNull)(),
                },
            }),
        ]);
        const participant = application.applicantId === userId
            ? application.job.creator
            : application.applicant;
        const participantName = participant?.full_name ||
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
    formatMessage(message) {
        if (!message)
            return null;
        const senderName = message.sender?.full_name ||
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
            attachments: message.attachments ||
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
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(chat_message_entity_1.ChatMessage)),
    __param(1, (0, typeorm_1.InjectRepository)(job_application_entity_1.JobApplication)),
    __param(2, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(3, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(4, (0, typeorm_1.InjectRepository)(page_member_entity_1.PageMember)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        notifications_service_1.NotificationsService])
], ChatService);
//# sourceMappingURL=chat.service.js.map