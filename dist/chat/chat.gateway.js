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
const jwt_1 = require("@nestjs/jwt");
const socket_io_1 = require("socket.io");
const websockets_2 = require("@nestjs/websockets");
const chat_service_1 = require("./chat.service");
const send_message_dto_1 = require("./dto/send-message.dto");
const chat_events_service_1 = require("./chat-events.service");
const conversations_service_1 = require("./conversations.service");
const messages_service_1 = require("./messages.service");
let ChatGateway = class ChatGateway {
    constructor(chatService, jwtService, events, conversations, messages) {
        this.chatService = chatService;
        this.jwtService = jwtService;
        this.events = events;
        this.conversations = conversations;
        this.messages = messages;
        this.typingAt = new Map();
    }
    afterInit(server) {
        this.events.attach(server);
    }
    async handleConnection(client) {
        try {
            const rawToken = (client.handshake.auth && client.handshake.auth.token) ||
                client.handshake.headers['authorization'] ||
                '';
            const token = rawToken.replace(/^Bearer\s+/i, '');
            if (!token)
                throw new Error('No token');
            const payload = this.jwtService.verify(token, {
                secret: process.env.JWT_SECRET,
            });
            client.userId = payload.id;
            await client.join(`user:${payload.id}`);
            this.events.connected(payload.id);
        }
        catch (e) {
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        const userId = client.userId;
        if (userId)
            this.events.disconnected(userId);
    }
    async send(client, body) {
        return this.safe(client, async (userId) => ({
            message: await this.messages.send(userId, Number(body?.conversationId), body ?? {}),
        }));
    }
    async typing(client, body) {
        return this.safe(client, async (userId) => {
            const conversationId = Number(body?.conversationId);
            const isTyping = body?.isTyping !== false;
            const k = `${userId}:${conversationId}`;
            const now = Date.now();
            if (isTyping && now - (this.typingAt.get(k) ?? 0) < 1000)
                return {};
            this.typingAt.set(k, now);
            if (this.typingAt.size > 5000)
                this.typingAt.clear();
            const { conv } = await this.conversations.requireAccess(conversationId, userId);
            const others = (await this.conversations.audience(conv)).filter((id) => id !== userId);
            this.events.emitToUsers(others, 'typing', { conversationId, userId, isTyping });
            return {};
        });
    }
    async read(client, body) {
        return this.safe(client, async (userId) => this.conversations.markRead(userId, Number(body?.conversationId), body?.messageId ? Number(body.messageId) : undefined));
    }
    async safe(client, fn) {
        const userId = client.userId;
        if (!userId)
            return { ok: false, error: 'Unauthorized', status: 401 };
        try {
            return { ok: true, ...(await fn(userId)) };
        }
        catch (err) {
            if (err instanceof common_1.HttpException) {
                return { ok: false, error: err.message, status: err.getStatus() };
            }
            return { ok: false, error: 'Something went wrong', status: 500 };
        }
    }
    async joinApplication(client, data) {
        const userId = client.userId;
        if (!userId)
            throw new websockets_2.WsException('Unauthorized');
        const canAccess = await this.chatService.userCanAccessApplication(userId, data.jobApplicationId);
        if (!canAccess)
            throw new websockets_2.WsException('Forbidden');
        const room = `application_${data.jobApplicationId}`;
        client.join(room);
        return { joined: true, room };
    }
    async sendMessage(client, dto) {
        const userId = client.userId;
        if (!userId)
            throw new websockets_2.WsException('Unauthorized');
        let message;
        try {
            message = await this.chatService.sendMessage(userId, dto);
        }
        catch (err) {
            if (err instanceof common_1.HttpException)
                throw new websockets_2.WsException(err.message);
            throw err;
        }
        const room = `application_${dto.jobApplicationId}`;
        this.server.to(room).emit('newMessage', message);
        return message;
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('conversation:send'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "send", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('conversation:typing'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "typing", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('conversation:read'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "read", null);
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
], ChatGateway.prototype, "sendMessage", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: 'chat',
        cors: { origin: '*' },
    }),
    __metadata("design:paramtypes", [chat_service_1.ChatService,
        jwt_1.JwtService,
        chat_events_service_1.ChatEvents,
        conversations_service_1.ConversationsService,
        messages_service_1.MessagesService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map