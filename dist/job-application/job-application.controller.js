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
exports.JobApplicationController = void 0;
const common_1 = require("@nestjs/common");
const job_application_service_1 = require("./job-application.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const joi_1 = __importDefault(require("joi"));
const throttler_1 = require("@nestjs/throttler");
let JobApplicationController = class JobApplicationController {
    constructor(jobAppService) {
        this.jobAppService = jobAppService;
    }
    async apply(body, idempotencyKey, req) {
        return this.jobAppService.apply({
            jobId: Number(body.jobId ?? body.job),
            applicantId: req.user.id,
            bidAmount: body.bidAmount,
            bidCurrency: body.bidCurrency,
            idempotencyKey,
        });
    }
    async getMyApplications(req, page = 1, limit = 10, status) {
        return this.jobAppService.getApplicationsByUser(req.user.id, +page, +limit, status);
    }
    async getHistory(req, status = 'completed', page = 1, limit = 20) {
        return this.jobAppService.getApplicationHistory(req.user.id, status, Number(page), Number(limit));
    }
    async getReceivedByJob(params, query, req) {
        return this.jobAppService.getReceivedApplicationsForJob(Number(params.jobId), req.user.id, {
            status: query.status,
            page: Number(query.page),
            limit: Number(query.limit),
        });
    }
    async getByJob(jobId) {
        return this.jobAppService.getApplicationsByJob(Number(jobId));
    }
    async updateStatus(params, body, req) {
        return this.jobAppService.updateStatus(Number(params.id), body.status, req.user.id);
    }
    async withdraw(id, req) {
        return this.jobAppService.withdraw(id, req.user.id);
    }
};
exports.JobApplicationController = JobApplicationController;
__decorate([
    (0, common_1.Post)(),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60_000 } }),
    __param(0, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        job: joi_1.default.number().integer().positive().optional(),
        jobId: joi_1.default.number().integer().positive().optional(),
        bidAmount: joi_1.default.number().positive().precision(2).optional(),
        bidCurrency: joi_1.default.string().trim().max(12).optional(),
    })
        .or('job', 'jobId')
        .messages({
        'object.missing': 'jobId is required',
    })))),
    __param(1, (0, common_1.Headers)('idempotency-key')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], JobApplicationController.prototype, "apply", null);
__decorate([
    (0, common_1.Get)('my'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], JobApplicationController.prototype, "getMyApplications", null);
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], JobApplicationController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Get)('job/:jobId/received'),
    __param(0, (0, common_1.Param)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        jobId: joi_1.default.number().required(),
    })))),
    __param(1, (0, common_1.Query)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        status: joi_1.default.string()
            .valid('pending', 'accepted', 'rejected', 'withdrawn', 'completed', 'all')
            .default('all'),
        page: joi_1.default.number().integer().min(1).default(1),
        limit: joi_1.default.number().integer().min(1).max(100).default(20),
    })))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], JobApplicationController.prototype, "getReceivedByJob", null);
__decorate([
    (0, common_1.Get)('job/:jobId'),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        jobId: joi_1.default.number().required(),
    }))),
    __param(0, (0, common_1.Param)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], JobApplicationController.prototype, "getByJob", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    __param(0, (0, common_1.Param)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        id: joi_1.default.number().required(),
    })))),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        status: joi_1.default.string()
            .valid('pending', 'accepted', 'rejected', 'withdrawn', 'completed')
            .required(),
    })))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], JobApplicationController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Patch)(':id/withdraw'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], JobApplicationController.prototype, "withdraw", null);
exports.JobApplicationController = JobApplicationController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('job-application'),
    __metadata("design:paramtypes", [job_application_service_1.JobApplicationService])
], JobApplicationController);
//# sourceMappingURL=job-application.controller.js.map