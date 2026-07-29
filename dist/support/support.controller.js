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
const joi_1 = __importDefault(require("joi"));
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const support_service_1 = require("./support.service");
const ticketPaginationSchema = joi_1.default.object({
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(100).default(20),
});
let SupportController = class SupportController {
    constructor(supportService) {
        this.supportService = supportService;
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
    listTickets(req, query) {
        return this.supportService.listTickets(req.user.id, query.page, query.limit);
    }
    getTicket(req, id) {
        return this.supportService.getTicket(id, req.user.id);
    }
    getMessages(req, id, query) {
        return this.supportService.getMessages(id, req.user.id, query.page, query.limit);
    }
    addMessage(req, id, body) {
        return this.supportService.addMessage(id, req.user.id, 'user', body.message);
    }
    addAttachment(req, id, file) {
        if (!file)
            throw new common_1.BadRequestException('No file provided');
        return this.supportService.addAttachment(req.user.id, id, file);
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
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        name: joi_1.default.string().optional().strip(),
        phone: joi_1.default.string().optional().strip(),
        subject: joi_1.default.string().trim().max(200).allow('', null).optional(),
        message: joi_1.default.string().trim().min(1).max(5000).required(),
        source: joi_1.default.string().trim().max(80).allow('', null).optional(),
    })))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "createContactMessage", null);
__decorate([
    (0, common_1.Post)('tickets'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        kind: joi_1.default.string().valid('feedback', 'complaint').required(),
        category: joi_1.default.string()
            .valid('app', 'payment', 'job_post', 'worker', 'chat', 'suggestion', 'other')
            .default('other'),
        subject: joi_1.default.string().trim().max(200).allow('', null).optional(),
        message: joi_1.default.string().trim().min(1).max(5000).required(),
        preferredContact: joi_1.default.string().max(80).allow('', null).optional(),
        contact: joi_1.default.string().max(255).allow('', null).optional(),
        attachments: joi_1.default.array()
            .items(joi_1.default.string().uri())
            .max(5)
            .optional(),
    })))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "createTicket", null);
__decorate([
    (0, common_1.Get)('tickets'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)(new joi_validation_pipe_1.JoiValidationPipe(ticketPaginationSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "listTickets", null);
__decorate([
    (0, common_1.Get)('tickets/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "getTicket", null);
__decorate([
    (0, common_1.Get)('tickets/:id/messages'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)(new joi_validation_pipe_1.JoiValidationPipe(ticketPaginationSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Object]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Post)('tickets/:id/messages'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        message: joi_1.default.string().trim().min(1).max(5000).required(),
    })))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Object]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "addMessage", null);
__decorate([
    (0, common_1.Post)('tickets/:id/attachments'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    })),
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
    __metadata("design:paramtypes", [support_service_1.SupportService])
], SupportController);
//# sourceMappingURL=support.controller.js.map