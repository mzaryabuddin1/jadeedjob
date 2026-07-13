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
exports.EmployerJobApplicationController = void 0;
const common_1 = require("@nestjs/common");
const joi_1 = __importDefault(require("joi"));
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const job_application_service_1 = require("./job-application.service");
let EmployerJobApplicationController = class EmployerJobApplicationController {
    constructor(jobAppService) {
        this.jobAppService = jobAppService;
    }
    async getJobApplications(params, query, req) {
        return this.jobAppService.getReceivedApplicationsForJob(Number(params.jobId), req.user.id, {
            status: query.status,
            page: Number(query.page),
            limit: Number(query.limit),
        });
    }
    async updateJobApplicationStatus(params, body, req) {
        return this.jobAppService.updateStatus(Number(params.id), body.status, req.user.id);
    }
};
exports.EmployerJobApplicationController = EmployerJobApplicationController;
__decorate([
    (0, common_1.Get)('jobs/:jobId/applications'),
    __param(0, (0, common_1.Param)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        jobId: joi_1.default.number().required(),
    })))),
    __param(1, (0, common_1.Query)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        status: joi_1.default.string()
            .valid('pending', 'accepted', 'rejected', 'all')
            .default('all'),
        page: joi_1.default.number().integer().min(1).default(1),
        limit: joi_1.default.number().integer().min(1).max(100).default(20),
    })))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], EmployerJobApplicationController.prototype, "getJobApplications", null);
__decorate([
    (0, common_1.Patch)('job-applications/:id/status'),
    __param(0, (0, common_1.Param)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        id: joi_1.default.number().required(),
    })))),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        status: joi_1.default.string()
            .valid('pending', 'accepted', 'rejected')
            .required(),
    })))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], EmployerJobApplicationController.prototype, "updateJobApplicationStatus", null);
exports.EmployerJobApplicationController = EmployerJobApplicationController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('employer'),
    __metadata("design:paramtypes", [job_application_service_1.JobApplicationService])
], EmployerJobApplicationController);
//# sourceMappingURL=employer-job-application.controller.js.map