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
exports.SupportController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const joi_1 = __importDefault(require("joi"));
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const files_service_1 = require("../files/files.service");
const support_service_1 = require("./support.service");
const supportAttachmentUploadOptions = {
    storage: (0, multer_1.diskStorage)({
        destination: (_req, _file, cb) => {
            const uploadPath = './uploads/support-tickets';
            require('fs').mkdirSync(uploadPath, { recursive: true });
            cb(null, uploadPath);
        },
        filename: (_req, file, cb) => {
            const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            cb(null, `${unique}${(0, path_1.extname)(file.originalname)}`);
        },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
};
let SupportController = class SupportController {
    constructor(supportService, filesService) {
        this.supportService = supportService;
        this.filesService = filesService;
    }
    getContactInfo() {
        return this.supportService.getContactInfo();
    }
    createContactMessage(req, body) {
        return this.supportService.createContactMessage(req.user.id, body);
    }
    createTicket(req, body) {
        return this.supportService.createTicket(req.user.id, body);
    }
    listTickets(req, page = 1, limit = 20) {
        return this.supportService.listTickets(req.user.id, Number(page), Number(limit));
    }
    addAttachment(req, id, file) {
        if (!file)
            throw new common_1.BadRequestException('No file provided');
        return this.supportService.addAttachment(req.user.id, id, file, this.filesService.getFileUrl(file.filename, 'support-tickets'));
    }
};
exports.SupportController = SupportController;
__decorate([
    (0, common_1.Get)('contact-info'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "getContactInfo", null);
__decorate([
    (0, common_1.Post)('contact-messages'),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        name: joi_1.default.string().required(),
        phone: joi_1.default.string().required(),
        subject: joi_1.default.string().required(),
        message: joi_1.default.string().required(),
        source: joi_1.default.string().allow('', null).optional(),
    }))),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "createContactMessage", null);
__decorate([
    (0, common_1.Post)('tickets'),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        kind: joi_1.default.string().valid('feedback', 'complaint').required(),
        category: joi_1.default.string()
            .valid('app', 'payment', 'job_post', 'worker', 'chat', 'suggestion', 'other')
            .default('other'),
        message: joi_1.default.string().required(),
        preferredContact: joi_1.default.string().allow('', null).optional(),
        contact: joi_1.default.string().allow('', null).optional(),
        attachments: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    }))),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "createTicket", null);
__decorate([
    (0, common_1.Get)('tickets'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "listTickets", null);
__decorate([
    (0, common_1.Post)('tickets/:id/attachments'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', supportAttachmentUploadOptions)),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Object]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "addAttachment", null);
exports.SupportController = SupportController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('support'),
    __metadata("design:paramtypes", [support_service_1.SupportService,
        files_service_1.FilesService])
], SupportController);
//# sourceMappingURL=support.controller.js.map