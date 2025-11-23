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
let ChatService = class ChatService {
    constructor(messageRepo, appRepo, jobRepo, userRepo) {
        this.messageRepo = messageRepo;
        this.appRepo = appRepo;
        this.jobRepo = jobRepo;
        this.userRepo = userRepo;
    }
    async userCanAccessApplication(userId, appId) {
        const app = await this.appRepo.findOne({
            where: { id: appId },
            relations: ['job', 'job.creator'],
        });
        if (!app)
            return false;
        const isApplicant = app.applicantId === userId;
        const isOwner = app.job.creator.id === userId;
        return isApplicant || isOwner;
    }
    async sendMessage(senderId, dto) {
        const { jobApplicationId, content } = dto;
        const app = await this.appRepo.findOne({
            where: { id: jobApplicationId },
            relations: ['job'],
        });
        if (!app)
            throw new common_1.NotFoundException('Job application not found');
        const allowed = await this.userCanAccessApplication(senderId, jobApplicationId);
        if (!allowed)
            throw new common_1.ForbiddenException('You cannot chat on this application');
        const msg = this.messageRepo.create({
            jobApplicationId,
            senderId,
            content,
        });
        await this.messageRepo.save(msg);
        return this.messageRepo.findOne({
            where: { id: msg.id },
            relations: ['sender'],
        });
    }
    async getMessages(jobApplicationId, userId, page = 1, limit = 20) {
        const allowed = await this.userCanAccessApplication(userId, jobApplicationId);
        if (!allowed)
            throw new common_1.ForbiddenException('You cannot view this chat');
        const [data, total] = await this.messageRepo.findAndCount({
            where: { jobApplicationId },
            relations: ['sender'],
            order: { createdAt: 'ASC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return {
            data,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
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
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ChatService);
//# sourceMappingURL=chat.service.js.map