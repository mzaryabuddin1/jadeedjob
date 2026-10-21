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
var ChatNotifier_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatNotifier = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const conversation_entity_1 = require("./entities/conversation.entity");
const conversation_member_entity_1 = require("./entities/conversation-member.entity");
const conversation_message_entity_1 = require("./entities/conversation-message.entity");
const job_entity_1 = require("../job/entities/job.entity");
const user_entity_1 = require("../users/entities/user.entity");
const notification_queue_service_1 = require("../notification/notification-queue.service");
const notification_service_1 = require("../notification/notification.service");
const conversations_service_1 = require("./conversations.service");
const num = (v, fallback) => v !== undefined && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : fallback;
const preview = (m) => {
    if (m.messageType === 'text') {
        const t = (m.content ?? '').replace(/\s+/g, ' ').trim();
        return t.length > 120 ? `${t.slice(0, 117)}...` : t;
    }
    return { image: 'Sent a photo', video: 'Sent a video', audio: 'Sent a voice message', file: 'Sent a file' }[m.messageType] ?? 'Sent a message';
};
let ChatNotifier = ChatNotifier_1 = class ChatNotifier {
    constructor(queue, notifications, conversations, memberRepo, msgRepo, jobRepo, userRepo) {
        this.queue = queue;
        this.notifications = notifications;
        this.conversations = conversations;
        this.memberRepo = memberRepo;
        this.msgRepo = msgRepo;
        this.jobRepo = jobRepo;
        this.userRepo = userRepo;
        this.logger = new common_1.Logger(ChatNotifier_1.name);
    }
    onModuleInit() {
        this.queue.register('chat_message', {
            delaySeconds: num(process.env.CHAT_NOTIFY_DELAY_SECONDS, 8),
            minGapSeconds: num(process.env.CHAT_NOTIFY_MIN_GAP_SECONDS, 30),
            handler: (items) => this.flush(items),
        });
    }
    async onMessage(conv, msg, memberIds) {
        try {
            const recipients = memberIds.filter((id) => id !== msg.senderId);
            if (!recipients.length)
                return;
            const members = await this.memberRepo.find({
                where: { conversationId: conv.id, userId: (0, typeorm_2.In)(recipients) },
            });
            const now = new Date();
            for (const userId of recipients) {
                const m = members.find((x) => x.userId === userId);
                if (m?.mutedUntil && m.mutedUntil > now)
                    continue;
                await this.queue.enqueue({
                    type: 'chat_message',
                    groupKey: `chat:${conv.id}:${userId}`,
                    recipientId: userId,
                    payload: { conversationId: conv.id, messageId: msg.id },
                });
            }
        }
        catch (err) {
            this.logger.error(`Could not queue chat notification: ${err?.message}`);
        }
    }
    async flush(items) {
        const recipientId = items[0].recipientId;
        const conversationId = items[0].payload.conversationId;
        const ids = items.map((i) => i.payload.messageId);
        const conv = await this.msgRepo.manager.findOne(conversation_entity_1.Conversation, { where: { id: conversationId } });
        if (!conv || !(await this.conversations.hasAccess(conv, recipientId))) {
            return { status: 'skipped', note: 'no longer has access' };
        }
        const member = await this.memberRepo.findOne({ where: { conversationId, userId: recipientId } });
        if (member?.mutedUntil && member.mutedUntil > new Date()) {
            return { status: 'skipped', note: 'muted' };
        }
        const lastRead = member?.lastReadMessageId ?? 0;
        const unread = (await this.msgRepo.find({
            where: { id: (0, typeorm_2.In)(ids), conversationId },
            order: { id: 'ASC' },
        })).filter((m) => !m.deletedAt && m.id > lastRead);
        if (!unread.length)
            return { status: 'skipped', note: 'already read' };
        const last = unread[unread.length - 1];
        const sender = await this.userRepo.findOne({
            where: { id: last.senderId },
            select: ['id', 'firstName', 'lastName'],
        });
        const name = `${sender?.firstName ?? ''} ${sender?.lastName ?? ''}`.trim() || 'Someone';
        let title = name;
        if (conv.jobId) {
            const job = await this.jobRepo.findOne({ where: { id: conv.jobId }, select: ['id', 'title'] });
            if (job)
                title = `${name} · ${job.title}`;
        }
        const body = unread.length === 1 ? preview(last) : `${unread.length} new messages: ${preview(last)}`;
        const res = await this.notifications.notifyUser(recipientId, {
            title,
            body,
            data: {
                type: 'chat_message',
                conversationId,
                messageId: last.id,
                senderId: last.senderId,
                senderName: name,
                count: unread.length,
                path: (process.env.NOTIFICATION_CHAT_PATH || '/chat/{id}').replace('{id}', String(conversationId)),
            },
        });
        return {
            status: 'sent',
            note: `"${body}" | push ${res.push}${res.email ? ' + email' : ''}`,
        };
    }
};
exports.ChatNotifier = ChatNotifier;
exports.ChatNotifier = ChatNotifier = ChatNotifier_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, typeorm_1.InjectRepository)(conversation_member_entity_1.ConversationMember)),
    __param(4, (0, typeorm_1.InjectRepository)(conversation_message_entity_1.ConversationMessage)),
    __param(5, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(6, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [notification_queue_service_1.NotificationQueueService,
        notification_service_1.NotificationService,
        conversations_service_1.ConversationsService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ChatNotifier);
//# sourceMappingURL=chat-notifier.js.map