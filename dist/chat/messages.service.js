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
exports.MessagesService = exports.MESSAGE_TEXT_MAX = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const conversation_entity_1 = require("./entities/conversation.entity");
const conversation_member_entity_1 = require("./entities/conversation-member.entity");
const conversation_message_entity_1 = require("./entities/conversation-message.entity");
const conversations_service_1 = require("./conversations.service");
const chat_events_service_1 = require("./chat-events.service");
const chat_notifier_1 = require("./chat-notifier");
exports.MESSAGE_TEXT_MAX = 1000;
const RATE_LIMIT = { count: 20, windowMs: 10_000 };
let MessagesService = class MessagesService {
    constructor(convRepo, memberRepo, msgRepo, conversations, events, notifier) {
        this.convRepo = convRepo;
        this.memberRepo = memberRepo;
        this.msgRepo = msgRepo;
        this.conversations = conversations;
        this.events = events;
        this.notifier = notifier;
        this.recent = new Map();
    }
    async send(userId, conversationId, dto) {
        const { conv, member } = await this.conversations.requireAccess(conversationId, userId);
        const messageType = dto.messageType ?? (dto.mediaUrl ? 'file' : 'text');
        const content = dto.content?.trim() || null;
        const mediaUrl = dto.mediaUrl?.trim() || null;
        if (!conversation_message_entity_1.MESSAGE_TYPES.includes(messageType)) {
            throw new common_1.BadRequestException('Unknown messageType');
        }
        if (messageType === 'text') {
            if (!content)
                throw new common_1.BadRequestException('Text messages must include content');
        }
        else if (!mediaUrl) {
            throw new common_1.BadRequestException('Media messages must include mediaUrl');
        }
        if (content && content.length > exports.MESSAGE_TEXT_MAX) {
            throw new common_1.BadRequestException(`A message can be at most ${exports.MESSAGE_TEXT_MAX} characters`);
        }
        if (dto.clientMsgId && dto.clientMsgId.length > 64) {
            throw new common_1.BadRequestException('clientMsgId can be at most 64 characters');
        }
        if (dto.clientMsgId) {
            const dup = await this.msgRepo.findOne({
                where: { conversationId, senderId: userId, clientMsgId: dto.clientMsgId },
            });
            if (dup)
                return { ...(await this.views([dup]))[0], duplicate: true };
        }
        await this.conversations.assertCanSend(conv, userId);
        this.checkRate(userId);
        let saved;
        try {
            saved = await this.msgRepo.save(this.msgRepo.create({
                conversationId,
                senderId: userId,
                messageType,
                content,
                mediaUrl: messageType === 'text' ? null : mediaUrl,
                clientMsgId: dto.clientMsgId ?? null,
            }));
        }
        catch (err) {
            if (err?.code === 'ER_DUP_ENTRY' && dto.clientMsgId) {
                const dup = await this.msgRepo.findOneOrFail({
                    where: { conversationId, senderId: userId, clientMsgId: dto.clientMsgId },
                });
                return { ...(await this.views([dup]))[0], duplicate: true };
            }
            throw err;
        }
        await Promise.all([
            this.convRepo.update(conv.id, { lastMessageId: saved.id, lastMessageAt: saved.createdAt }),
            this.memberRepo.update(member.id, { lastReadMessageId: saved.id }),
        ]);
        const view = (await this.views([saved]))[0];
        this.events.emitToUsers(await this.conversations.audience(conv), 'message:new', {
            conversationId: conv.id,
            message: view,
        });
        void this.conversations
            .recipientsFor(conv, userId)
            .then((recipients) => this.notifier.onMessage(conv, saved, recipients));
        return view;
    }
    checkRate(userId) {
        const now = Date.now();
        const list = (this.recent.get(userId) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
        if (list.length >= RATE_LIMIT.count) {
            throw new common_1.HttpException('You are sending messages too fast', 429);
        }
        list.push(now);
        this.recent.set(userId, list);
    }
    async list(userId, conversationId, opts) {
        await this.conversations.requireAccess(conversationId, userId);
        const limit = Math.min(100, Math.max(1, Number(opts.limit) || 30));
        if (opts.after) {
            const rows = await this.msgRepo
                .createQueryBuilder('m')
                .where('m.conversationId = :conversationId AND m.id > :after', {
                conversationId,
                after: opts.after,
            })
                .orderBy('m.id', 'ASC')
                .take(limit + 1)
                .getMany();
            const hasMore = rows.length > limit;
            const page = rows.slice(0, limit);
            return {
                data: await this.views(page),
                nextCursor: null,
                hasMore,
                lastId: page.length ? page[page.length - 1].id : opts.after,
            };
        }
        const qb = this.msgRepo
            .createQueryBuilder('m')
            .where('m.conversationId = :conversationId', { conversationId })
            .orderBy('m.id', 'DESC')
            .take(limit + 1);
        if (opts.before)
            qb.andWhere('m.id < :before', { before: opts.before });
        const rows = await qb.getMany();
        const hasMore = rows.length > limit;
        const page = rows.slice(0, limit).reverse();
        return {
            data: await this.views(page),
            nextCursor: hasMore ? page[0].id : null,
            hasMore,
        };
    }
    async remove(userId, messageId) {
        const msg = await this.msgRepo.findOne({ where: { id: messageId } });
        if (!msg || msg.deletedAt)
            throw new common_1.NotFoundException('Message not found');
        if (msg.senderId !== userId)
            throw new common_1.ForbiddenException('You can only delete your own messages');
        const { conv } = await this.conversations.requireAccess(msg.conversationId, userId);
        await this.msgRepo.update(msg.id, { deletedAt: new Date() });
        this.events.emitToUsers(await this.conversations.audience(conv), 'message:deleted', {
            conversationId: msg.conversationId,
            messageId: msg.id,
        });
        return { message: 'Message deleted' };
    }
    async views(messages) {
        const users = await this.conversations.usersById(messages.map((m) => m.senderId));
        return messages.map((m) => ({
            id: m.id,
            conversationId: m.conversationId,
            senderId: m.senderId,
            messageType: m.messageType,
            content: m.deletedAt ? null : m.content,
            mediaUrl: m.deletedAt ? null : m.mediaUrl,
            clientMsgId: m.clientMsgId,
            deleted: !!m.deletedAt,
            createdAt: m.createdAt,
            sender: (0, conversations_service_1.personView)(users.get(m.senderId)),
        }));
    }
};
exports.MessagesService = MessagesService;
exports.MessagesService = MessagesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(conversation_entity_1.Conversation)),
    __param(1, (0, typeorm_1.InjectRepository)(conversation_member_entity_1.ConversationMember)),
    __param(2, (0, typeorm_1.InjectRepository)(conversation_message_entity_1.ConversationMessage)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        conversations_service_1.ConversationsService,
        chat_events_service_1.ChatEvents,
        chat_notifier_1.ChatNotifier])
], MessagesService);
//# sourceMappingURL=messages.service.js.map