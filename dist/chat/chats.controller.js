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
const multer_1 = require("multer");
const path_1 = require("path");
const joi_1 = __importDefault(require("joi"));
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const files_service_1 = require("../files/files.service");
const chat_service_1 = require("./chat.service");
const chatAttachmentUploadOptions = {
    storage: (0, multer_1.diskStorage)({
        destination: (_req, _file, cb) => {
            const uploadPath = './uploads/chat-attachments';
            require('fs').mkdirSync(uploadPath, { recursive: true });
            cb(null, uploadPath);
        },
        filename: (_req, file, cb) => {
            const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            cb(null, `${unique}${(0, path_1.extname)(file.originalname)}`);
        },
    }),
    limits: { fileSize: 20 * 1024 * 1024 },
};
let ChatsController = class ChatsController {
    constructor(chatService, filesService) {
        this.chatService = chatService;
        this.filesService = filesService;
    }
    list(req, page = 1, limit = 20) {
        return this.chatService.listChats(req.user.id, Number(page), Number(limit));
    }
    getMessages(chatId, page = 1, limit = 20, req) {
        return this.chatService.getMessages(chatId, req.user.id, Number(page), Number(limit));
    }
    sendMessage(chatId, body, req) {
        return this.chatService.sendMessage(req.user.id, {
            jobApplicationId: chatId,
            content: body.content ?? body.text,
            mediaUrl: body.mediaUrl,
            messageType: body.messageType,
            attachments: body.attachments,
        });
    }
    async uploadAttachment(chatId, file, req) {
        if (!file)
            throw new common_1.BadRequestException('No file provided');
        const allowed = await this.chatService.userCanAccessApplication(req.user.id, chatId);
        if (!allowed)
            throw new common_1.ForbiddenException('You cannot update this chat');
        const fileUrl = this.filesService.getFileUrl(file.filename, 'chat-attachments');
        return {
            message: 'Attachment uploaded successfully',
            attachment: this.chatService.formatUploadedAttachment(file, fileUrl),
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
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], ChatsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':chatId/messages'),
    __param(0, (0, common_1.Param)('chatId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], ChatsController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Post)(':chatId/messages'),
    __param(0, (0, common_1.Param)('chatId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        text: joi_1.default.string().allow('', null).optional(),
        content: joi_1.default.string().allow('', null).optional(),
        mediaUrl: joi_1.default.string().allow('', null).optional(),
        messageType: joi_1.default.string()
            .valid('text', 'image', 'video', 'audio', 'file')
            .default('text'),
        attachments: joi_1.default.array()
            .items(joi_1.default.object({
            fileUrl: joi_1.default.string().required(),
            fileName: joi_1.default.string().allow('', null).optional(),
            contentType: joi_1.default.string().allow('', null).optional(),
        }))
            .optional(),
    })))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], ChatsController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Post)(':chatId/attachments'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', chatAttachmentUploadOptions)),
    __param(0, (0, common_1.Param)('chatId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "uploadAttachment", null);
__decorate([
    (0, common_1.Patch)(':chatId/read'),
    __param(0, (0, common_1.Param)('chatId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ChatsController.prototype, "markRead", null);
exports.ChatsController = ChatsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('chats'),
    __metadata("design:paramtypes", [chat_service_1.ChatService,
        files_service_1.FilesService])
], ChatsController);
//# sourceMappingURL=chats.controller.js.map