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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const joi_1 = __importDefault(require("joi"));
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const object_storage_service_1 = require("../storage/object-storage.service");
const chat_service_1 = require("./chat.service");
const throttler_1 = require("@nestjs/throttler");
const paginationSchema = joi_1.default.object({
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(100).default(20),
});
const messageQuerySchema = paginationSchema.keys({
    before: joi_1.default.string()
        .pattern(/^[1-9]\d*$/)
        .optional(),
});
const messageSchema = joi_1.default.object({
    text: joi_1.default.string().allow('', null).max(2000).optional(),
    content: joi_1.default.string().allow('', null).max(2000).optional(),
    mediaUrl: joi_1.default.string().uri().allow('', null).optional(),
    messageType: joi_1.default.string()
        .valid('text', 'image', 'video', 'audio', 'file')
        .default('text'),
    attachments: joi_1.default.array()
        .items(joi_1.default.object({
        assetId: joi_1.default.string().guid({ version: 'uuidv4' }).optional(),
        fileUrl: joi_1.default.string().uri().required(),
        fileName: joi_1.default.string().allow('', null).max(255).optional(),
        contentType: joi_1.default.string().allow('', null).max(120).optional(),
    }))
        .max(10)
        .optional(),
    clientMessageId: joi_1.default.string().trim().max(120).optional(),
});
const contextSchema = joi_1.default.object({
    action: joi_1.default.string().valid('invite', 'inquiry').required(),
    profileType: joi_1.default.string().valid('user', 'company').required(),
    profileId: joi_1.default.alternatives()
        .try(joi_1.default.number().integer().positive(), joi_1.default.string().pattern(/^[1-9]\d*$/))
        .required(),
    jobId: joi_1.default.alternatives()
        .try(joi_1.default.number().integer().positive(), joi_1.default.string().pattern(/^[1-9]\d*$/))
        .required(),
    clientRequestId: joi_1.default.string().trim().max(120).required(),
});
let ChatsController = class ChatsController {
    constructor(chatService, storageService) {
        this.chatService = chatService;
        this.storageService = storageService;
    }
    list(req, query) {
        return this.chatService.listChats(req.user.id, query.page, query.limit);
    }
    createContext(req, idempotencyKey, body) {
        return this.chatService.createContext(req.user.id, {
            ...body,
            clientRequestId: String(idempotencyKey || '').trim() || body.clientRequestId,
        });
    }
    getMessages(chatId, query, req) {
        return this.chatService.getMessages(chatId, req.user.id, query.before || query.page, query.limit);
    }
    sendMessage(chatId, body, req) {
        return this.chatService.sendMessage(req.user.id, {
            conversationId: chatId,
            content: body.content ?? body.text,
            mediaUrl: body.mediaUrl,
            messageType: body.messageType,
            attachments: body.attachments,
            clientMessageId: body.clientMessageId,
        });
    }
    async uploadAttachment(chatId, file, req) {
        if (!file)
            throw new common_1.BadRequestException('No file provided');
        await this.chatService.canWriteConversation(req.user.id, chatId);
        const asset = await this.storageService.store({
            ownerUserId: req.user.id,
            purpose: 'chat-attachments',
            file,
            allowedTypes: [
                'image/jpeg',
                'image/png',
                'image/webp',
                'application/pdf',
                'video/mp4',
                'video/quicktime',
                'audio/mpeg',
                'audio/mp4',
            ],
            maxBytes: 20 * 1024 * 1024,
            visibility: 'private',
            metadata: { conversationId: chatId },
        });
        return {
            message: 'Attachment uploaded successfully',
            attachment: {
                assetId: asset.id,
                fileName: asset.originalName,
                fileUrl: await this.storageService.getUrl(asset),
                contentType: asset.contentType,
                sizeBytes: asset.sizeBytes,
            },
        };
    }
    markRead(chatId, req) {
        return this.chatService.markRead(chatId, req.user.id);
    }
};
exports.ChatsController = ChatsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)(new joi_validation_pipe_1.JoiValidationPipe(paginationSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ChatsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('contexts'),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60_000 } }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('idempotency-key')),
    __param(2, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(contextSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ChatsController.prototype, "createContext", null);
__decorate([
    (0, common_1.Get)(':chatId/messages'),
    __param(0, (0, common_1.Param)('chatId')),
    __param(1, (0, common_1.Query)(new joi_validation_pipe_1.JoiValidationPipe(messageQuerySchema))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], ChatsController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Post)(':chatId/messages'),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __param(0, (0, common_1.Param)('chatId')),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(messageSchema))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], ChatsController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Post)(':chatId/attachments'),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 600_000 } }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: 20 * 1024 * 1024, files: 1 },
    })),
    __param(0, (0, common_1.Param)('chatId')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "uploadAttachment", null);
__decorate([
    (0, common_1.Patch)(':chatId/read'),
    __param(0, (0, common_1.Param)('chatId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ChatsController.prototype, "markRead", null);
exports.ChatsController = ChatsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('chats'),
    __metadata("design:paramtypes", [chat_service_1.ChatService,
        object_storage_service_1.ObjectStorageService])
], ChatsController);
//# sourceMappingURL=chats.controller.js.map