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
var ChatMigration_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMigration = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const chat_message_entity_1 = require("./entities/chat-message.entity");
const conversation_entity_1 = require("./entities/conversation.entity");
const conversation_member_entity_1 = require("./entities/conversation-member.entity");
const conversation_message_entity_1 = require("./entities/conversation-message.entity");
const job_application_entity_1 = require("../job-application/entities/job-application.entity");
let ChatMigration = ChatMigration_1 = class ChatMigration {
    constructor(legacyRepo, convRepo, memberRepo, msgRepo, appRepo) {
        this.legacyRepo = legacyRepo;
        this.convRepo = convRepo;
        this.memberRepo = memberRepo;
        this.msgRepo = msgRepo;
        this.appRepo = appRepo;
        this.logger = new common_1.Logger(ChatMigration_1.name);
    }
    onApplicationBootstrap() {
        void this.run().catch((err) => this.logger.error(`Chat migration failed: ${err?.message}`));
    }
    async run() {
        await this.convRepo.query("UPDATE IGNORE conversations SET type = 'job', `key` = CONCAT('j:', jobId, ':', createdBy) WHERE type = 'application' AND jobId IS NOT NULL");
        const pending = await this.legacyRepo
            .createQueryBuilder('m')
            .select('DISTINCT m.jobApplicationId', 'appId')
            .where("NOT EXISTS (SELECT 1 FROM job_applications ja INNER JOIN conversations c ON c.`key` = CONCAT('j:', ja.jobId, ':', ja.applicantId) WHERE ja.id = m.jobApplicationId)")
            .getRawMany();
        if (!pending.length)
            return;
        let done = 0;
        for (const { appId } of pending) {
            try {
                await this.migrateApplication(Number(appId));
                done++;
            }
            catch (err) {
                this.logger.error(`Application ${appId} not migrated: ${err?.message}`);
            }
        }
        this.logger.log(`Migrated ${done}/${pending.length} application chats to conversations`);
    }
    async migrateApplication(appId) {
        const app = await this.appRepo.findOne({ where: { id: appId }, relations: ['job'] });
        if (!app)
            return;
        const old = await this.legacyRepo.find({
            where: { jobApplicationId: appId },
            order: { id: 'ASC' },
            loadEagerRelations: false,
        });
        if (!old.length)
            return;
        await this.convRepo.manager.transaction(async (m) => {
            const conv = await m.save(m.create(conversation_entity_1.Conversation, {
                type: 'job',
                key: `j:${app.jobId}:${app.applicantId}`,
                jobId: app.jobId,
                createdBy: app.applicantId,
            }));
            let lastId = 0;
            let lastAt = null;
            for (const o of old) {
                const saved = await m.save(m.create(conversation_message_entity_1.ConversationMessage, {
                    conversationId: conv.id,
                    senderId: o.senderId,
                    messageType: o.messageType,
                    content: o.content ?? null,
                    mediaUrl: o.mediaUrl ?? null,
                    createdAt: o.createdAt,
                }));
                lastId = saved.id;
                lastAt = o.createdAt;
            }
            await m.update(conversation_entity_1.Conversation, conv.id, { lastMessageId: lastId, lastMessageAt: lastAt });
            for (const userId of new Set([app.applicantId, app.job.createdBy])) {
                await m.insert(conversation_member_entity_1.ConversationMember, { conversationId: conv.id, userId, lastReadMessageId: lastId });
            }
        });
    }
};
exports.ChatMigration = ChatMigration;
exports.ChatMigration = ChatMigration = ChatMigration_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(chat_message_entity_1.ChatMessage)),
    __param(1, (0, typeorm_1.InjectRepository)(conversation_entity_1.Conversation)),
    __param(2, (0, typeorm_1.InjectRepository)(conversation_member_entity_1.ConversationMember)),
    __param(3, (0, typeorm_1.InjectRepository)(conversation_message_entity_1.ConversationMessage)),
    __param(4, (0, typeorm_1.InjectRepository)(job_application_entity_1.JobApplication)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ChatMigration);
//# sourceMappingURL=chat-migration.service.js.map