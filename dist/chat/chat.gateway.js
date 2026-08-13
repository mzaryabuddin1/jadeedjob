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
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const auth_session_service_1 = require("../auth/auth-session.service");
const chat_service_1 = require("./chat.service");
const send_message_dto_1 = require("./dto/send-message.dto");
const realtime_presence_service_1 = require("../realtime/realtime-presence.service");
const legal_service_1 = require("../legal/legal.service");
const socketOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
let ChatGateway = class ChatGateway {
    constructor(chatService, authSessionService, presenceService, legalService) {
        this.chatService = chatService;
        this.authSessionService = authSessionService;
        this.presenceService = presenceService;
        this.legalService = legalService;
        this.eventRateLimits = new Map();
    }
    async handleConnection(client) {
        try {
            const rawToken = client.handshake.auth?.token ||
                client.handshake.headers.authorization ||
                '';
            const token = rawToken.replace(/^Bearer\s+/i, '').trim();
            if (!token)
                throw new Error('No token');
            const payload = await this.authSessionService.validateToken(token);
            client.data.accessToken = token;
            client.data.userId = payload.id;
            await client.join(this.userRoom(payload.id));
        }
        catch {
            client.disconnect(true);
        }
    }
    handleDisconnect(client) {
        this.presenceService.clearSocket(client.id).catch(() => undefined);
        for (const key of this.eventRateLimits.keys()) {
            if (key.startsWith(`${client.id}:`)) {
                this.eventRateLimits.delete(key);
            }
        }
    }
    async join(client, body) {
        return this.ack(async (userId) => {
            const reference = body?.conversationId || body?.chatId;
            const conversation = await this.chatService.assertCanJoinConversation(userId, reference);
            await client.join(this.chatRoom(conversation.id));
            await this.presenceService.markActive(userId, conversation.id, client.id);
            return {
                chatId: conversation.id,
                conversationId: conversation.id,
                joined: true,
            };
        }, client);
    }
    async leave(client, body) {
        return this.ack(async (userId) => {
            const reference = body?.conversationId || body?.chatId;
            const conversation = await this.chatService.assertCanJoinConversation(userId, reference);
            await client.leave(this.chatRoom(conversation.id));
            await this.presenceService.markInactive(userId, conversation.id, client.id);
            return {
                chatId: conversation.id,
                conversationId: conversation.id,
                left: true,
            };
        }, client);
    }
    async send(client, body) {
        return this.ack(async (userId) => {
            this.enforceEventRateLimit(client, 'chat:message.send', 30, 10_000);
            await this.legalService.assertCommunityAccepted(userId);
            const reference = body?.conversationId || body?.chatId;
            const message = await this.chatService.sendMessage(userId, {
                conversationId: reference,
                clientMessageId: body?.clientMessageId,
                content: body?.content ?? body?.text,
                mediaUrl: body?.mediaUrl,
                messageType: body?.messageType,
                attachments: body?.attachments,
            });
            this.server
                .to(this.chatRoom(message.conversationId))
                .emit('chat:message.created', message);
            await this.emitInboxUpdates(message.conversationId);
            return message;
        }, client);
    }
    async read(client, body) {
        return this.ack(async (userId) => {
            const reference = body?.conversationId || body?.chatId;
            const state = await this.chatService.markRead(reference, userId);
            this.server
                .to(this.chatRoom(state.conversationId))
                .emit('chat:read.updated', { ...state, userId });
            await this.emitInboxUpdates(state.conversationId);
            return state;
        }, client);
    }
    async typing(client, body) {
        return this.ack(async (userId) => {
            this.enforceEventRateLimit(client, 'chat:typing', 30, 10_000);
            const reference = body?.conversationId || body?.chatId;
            await this.chatService.canWriteConversation(userId, reference);
            const audience = await this.chatService.realtimeAudienceIds(reference);
            const update = {
                chatId: audience.conversationId,
                conversationId: audience.conversationId,
                userId,
                typing: Boolean(body?.typing),
            };
            client
                .to(this.chatRoom(audience.conversationId))
                .emit('chat:typing.updated', update);
            return update;
        }, client);
    }
    async joinApplication(client, body) {
        const result = await this.join(client, {
            conversationId: String(body?.jobApplicationId || ''),
        });
        if (result.ok) {
            await client.join(`application_${body.jobApplicationId}`);
            return { joined: true, room: `application_${body.jobApplicationId}` };
        }
        return result;
    }
    async sendLegacy(client, dto) {
        const result = await this.ack(async (userId) => {
            this.enforceEventRateLimit(client, 'sendMessage', 30, 10_000);
            await this.legalService.assertCommunityAccepted(userId);
            const message = await this.chatService.sendMessage(userId, dto);
            this.server
                .to(`application_${dto.jobApplicationId}`)
                .emit('newMessage', message);
            this.server
                .to(this.chatRoom(message.conversationId))
                .emit('chat:message.created', message);
            await this.emitInboxUpdates(message.conversationId);
            return message;
        }, client);
        return result.ok ? result.data : result;
    }
    emitInvitationUpdated(conversationId, data) {
        this.server
            ?.to(this.chatRoom(conversationId))
            .emit('chat:invitation.updated', data);
    }
    emitInvitationUpdatedForUsers(updates) {
        for (const update of updates) {
            this.server
                ?.to(this.userRoom(update.userId))
                .emit('chat:invitation.updated', update.payload);
        }
    }
    async ack(operation, client) {
        try {
            const userId = await this.authenticatedUserId(client);
            return { ok: true, data: await operation(userId) };
        }
        catch (error) {
            return { ok: false, error: this.socketError(error) };
        }
    }
    async authenticatedUserId(client) {
        const handshakeToken = String(client.handshake.auth?.token ||
            client.handshake.headers.authorization ||
            '')
            .replace(/^Bearer\s+/i, '')
            .trim();
        const token = String(client.data.accessToken || handshakeToken);
        if (!token)
            throw new Error('Unauthorized');
        const payload = await this.authSessionService.validateToken(token);
        client.data.accessToken = token;
        client.data.userId = payload.id;
        return payload.id;
    }
    async emitInboxUpdates(reference) {
        const audience = await this.chatService.realtimeAudienceIds(reference);
        for (const userId of audience.userIds) {
            this.server.to(this.userRoom(userId)).emit('chat:inbox.updated', {
                chatId: audience.conversationId,
                conversationId: audience.conversationId,
            });
        }
    }
    socketError(error) {
        if (error instanceof common_1.HttpException) {
            const response = error.getResponse();
            return {
                code: response?.code ||
                    (error.getStatus() === 401
                        ? 'AUTH_SESSION_INVALID'
                        : error.getStatus() === 403
                            ? 'CHAT_FORBIDDEN'
                            : 'CHAT_REQUEST_FAILED'),
                message: response?.message ||
                    (typeof response === 'string' ? response : error.message),
                ...(response?.details === undefined
                    ? {}
                    : { details: response.details }),
            };
        }
        return {
            code: 'CHAT_REQUEST_FAILED',
            message: error instanceof Error ? error.message : 'Chat request failed',
        };
    }
    chatRoom(conversationId) {
        return `chat:${conversationId}`;
    }
    userRoom(userId) {
        return `user:${userId}`;
    }
    enforceEventRateLimit(client, event, limit, windowMs) {
        const now = Date.now();
        const key = `${client.id}:${event}`;
        const current = this.eventRateLimits.get(key);
        if (!current || current.resetAt <= now) {
            this.eventRateLimits.set(key, { count: 1, resetAt: now + windowMs });
            return;
        }
        if (current.count >= limit) {
            throw new common_1.HttpException({
                code: 'RATE_LIMIT_EXCEEDED',
                message: `Too many ${event} events`,
            }, 429);
        }
        current.count += 1;
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:join'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "join", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:leave'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "leave", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:message.send'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "send", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:read'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "read", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:typing'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "typing", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('joinApplication'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "joinApplication", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('sendMessage'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket,
        send_message_dto_1.SendMessageDto]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "sendLegacy", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: '/chat',
        path: process.env.SOCKET_PATH || '/socket.io',
        cors: {
            origin: socketOrigins.length > 0
                ? socketOrigins
                : process.env.NODE_ENV === 'production'
                    ? false
                    : true,
            credentials: true,
        },
    }),
    __metadata("design:paramtypes", [chat_service_1.ChatService,
        auth_session_service_1.AuthSessionService,
        realtime_presence_service_1.RealtimePresenceService,
        legal_service_1.LegalService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map