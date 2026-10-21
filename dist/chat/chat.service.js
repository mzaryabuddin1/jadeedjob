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
const page_entity_1 = require("../pages/entities/page.entity");
const job_team_util_1 = require("./job-team.util");
const conversation_entity_1 = require("./entities/conversation.entity");
const conversation_message_entity_1 = require("./entities/conversation-message.entity");
const conversations_service_1 = require("./conversations.service");
const messages_service_1 = require("./messages.service");
let ChatService = class ChatService {
    constructor(appRepo, pageRepo, convRepo, msgRepo, conversations, messages) {
        this.appRepo = appRepo;
        this.pageRepo = pageRepo;
        this.convRepo = convRepo;
        this.msgRepo = msgRepo;
        this.conversations = conversations;
        this.messages = messages;
    }
    async userCanAccessApplication(userId, appId) {
        const app = await this.appRepo.findOne({
            where: { id: appId },
            relations: ['job'],
        });
        if (!app)
            return false;
        if (app.applicantId === userId)
            return true;
        return (0, job_team_util_1.isJobTeam)(this.pageRepo, app.job, userId);
    }
    async conversationOf(userId, applicationId) {
        const app = await this.appRepo.findOne({ where: { id: applicationId } });
        if (!app)
            throw new common_1.NotFoundException('Job application not found');
        return this.conversations.getOrCreate(userId, userId === app.applicantId
            ? { type: 'job', jobId: app.jobId }
            : { type: 'job', jobId: app.jobId, userId: app.applicantId }, { allowInactive: true });
    }
    async sendMessage(senderId, dto) {
        const conv = await this.conversationOf(senderId, dto.jobApplicationId);
        const msg = await this.messages.send(senderId, conv.id, {
            content: dto.content,
            mediaUrl: dto.mediaUrl,
            messageType: dto.messageType,
        });
        return this.legacy(msg, dto.jobApplicationId);
    }
    async getMessages(jobApplicationId, userId, page = 1, limit = 20) {
        const app = await this.appRepo.findOne({ where: { id: jobApplicationId } });
        if (!app)
            throw new common_1.NotFoundException('Job application not found');
        if (!(await this.userCanAccessApplication(userId, jobApplicationId))) {
            throw new common_1.ForbiddenException('You cannot view this chat');
        }
        const conv = await this.convRepo.findOne({
            where: { key: `j:${app.jobId}:${app.applicantId}` },
        });
        if (!conv) {
            return { data: [], total: 0, totalPages: 0, currentPage: page };
        }
        const [rows, total] = await this.msgRepo.findAndCount({
            where: { conversationId: conv.id },
            order: { id: 'ASC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        const views = await this.messages.views(rows);
        return {
            data: views.map((v) => this.legacy(v, jobApplicationId)),
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        };
    }
    legacy(v, jobApplicationId) {
        const [firstName, ...rest] = (v.sender?.name ?? '').split(' ');
        return {
            id: v.id,
            jobApplicationId,
            senderId: v.senderId,
            content: v.content,
            mediaUrl: v.mediaUrl,
            messageType: v.messageType,
            createdAt: v.createdAt,
            sender: v.sender
                ? {
                    id: v.sender.id,
                    firstName,
                    lastName: rest.join(' '),
                    username: v.sender.username,
                    profile_photo: v.sender.profile_photo,
                }
                : null,
        };
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_application_entity_1.JobApplication)),
    __param(1, (0, typeorm_1.InjectRepository)(page_entity_1.Page)),
    __param(2, (0, typeorm_1.InjectRepository)(conversation_entity_1.Conversation)),
    __param(3, (0, typeorm_1.InjectRepository)(conversation_message_entity_1.ConversationMessage)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        conversations_service_1.ConversationsService,
        messages_service_1.MessagesService])
], ChatService);
//# sourceMappingURL=chat.service.js.map