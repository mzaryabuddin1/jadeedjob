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
exports.AdminReelReportController = void 0;
const common_1 = require("@nestjs/common");
const joi_1 = __importDefault(require("joi"));
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const system_admin_guard_1 = require("../auth/system-admin.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const moderation_service_1 = require("./moderation.service");
let AdminReelReportController = class AdminReelReportController {
    constructor(moderationService) {
        this.moderationService = moderationService;
    }
    list(query) {
        return this.moderationService.listReelReports(query.status, query.page, query.limit);
    }
    resolve(reportId, req, body) {
        return this.moderationService.resolveReelReport(reportId, req.user.id, body.status, body.resolutionNote);
    }
};
exports.AdminReelReportController = AdminReelReportController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        status: joi_1.default.string()
            .valid('pending', 'reviewed', 'dismissed', 'actioned', 'all')
            .default('pending'),
        page: joi_1.default.number().integer().min(1).default(1),
        limit: joi_1.default.number().integer().min(1).max(100).default(20),
    })))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminReelReportController.prototype, "list", null);
__decorate([
    (0, common_1.Patch)(':reportId'),
    __param(0, (0, common_1.Param)('reportId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        status: joi_1.default.string()
            .valid('reviewed', 'dismissed', 'actioned')
            .required(),
        resolutionNote: joi_1.default.string().trim().max(2000).allow('', null).optional(),
    })))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminReelReportController.prototype, "resolve", null);
exports.AdminReelReportController = AdminReelReportController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, system_admin_guard_1.SystemAdminGuard),
    (0, common_1.Controller)('admin/reel-reports'),
    __metadata("design:paramtypes", [moderation_service_1.ModerationService])
], AdminReelReportController);
//# sourceMappingURL=admin-reel-report.controller.js.map