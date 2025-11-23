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
const jwt_1 = require("@nestjs/jwt");
const chat_service_1 = require("./chat.service");
const send_message_dto_1 = require("./dto/send-message.dto");
const socket_io_1 = require("socket.io");
const websockets_2 = require("@nestjs/websockets");
let ChatGateway = class ChatGateway {
    constructor(chatService, jwtService) {
        this.chatService = chatService;
        this.jwtService = jwtService;
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
        }
        catch (e) {
            client.disconnect();
        }
    }
    handleDisconnect(client) {
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
        const message = await this.chatService.sendMessage(userId, dto);
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
        jwt_1.JwtService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map