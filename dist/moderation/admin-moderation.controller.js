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
exports.AdminModerationController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const joi_1 = __importDefault(require("joi"));
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const system_admin_guard_1 = require("../auth/system-admin.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const moderation_service_1 = require("./moderation.service");
const swagger_1 = require("@nestjs/swagger");
const moderation_api_dto_1 = require("./dto/moderation-api.dto");
const listSchema = joi_1.default.object({
    status: joi_1.default.string().valid('pending', 'dismissed', 'actioned', 'all').default('pending'),
    targetType: joi_1.default.string()
        .valid('post', 'post_comment', 'reel', 'reel_comment', 'user', 'company', 'chat_message', 'job')
        .optional(),
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(100).default(20),
});
const actionSchema = joi_1.default.object({
    action: joi_1.default.string()
        .valid('dismiss', 'hide', 'remove', 'warn', 'suspend', 'ban')
        .required(),
    notes: joi_1.default.string().trim().max(2000).allow('', null).optional(),
    suspensionEndsAt: joi_1.default.date().iso().allow(null).optional(),
});
let AdminModerationController = class AdminModerationController {
    constructor(moderationService) {
        this.moderationService = moderationService;
    }
    list(query) {
        return this.moderationService.listReports(query);
    }
    detail(reportId) {
        return this.moderationService.getReport(reportId);
    }
    resolve(reportId, req, body) {
        return this.moderationService.resolveReport(reportId, req.user.id, body);
    }
};
exports.AdminModerationController = AdminModerationController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List canonical moderation reports' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, enum: ['pending', 'dismissed', 'actioned', 'all'] }),
    (0, swagger_1.ApiQuery)({ name: 'targetType', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Query)(new joi_validation_pipe_1.JoiValidationPipe(listSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminModerationController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':reportId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a moderation report and immutable audit history' }),
    (0, swagger_1.ApiOkResponse)({ type: moderation_api_dto_1.ModerationReportDto }),
    __param(0, (0, common_1.Param)('reportId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AdminModerationController.prototype, "detail", null);
__decorate([
    (0, common_1.Patch)(':reportId'),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Resolve a moderation report and record an audit action' }),
    (0, swagger_1.ApiBody)({ type: moderation_api_dto_1.ResolveModerationReportDto }),
    (0, swagger_1.ApiOkResponse)({ type: moderation_api_dto_1.ModerationReportDto }),
    __param(0, (0, common_1.Param)('reportId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(actionSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminModerationController.prototype, "resolve", null);
exports.AdminModerationController = AdminModerationController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, system_admin_guard_1.SystemAdminGuard),
    (0, common_1.Controller)('admin/moderation/reports'),
    (0, swagger_1.ApiTags)('Admin moderation'),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [moderation_service_1.ModerationService])
], AdminModerationController);
//# sourceMappingURL=admin-moderation.controller.js.map