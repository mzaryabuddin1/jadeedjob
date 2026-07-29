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
exports.JobController = void 0;
const common_1 = require("@nestjs/common");
const job_service_1 = require("./job.service");
const joi_1 = __importDefault(require("joi"));
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const optional_jwt_auth_guard_1 = require("../auth/optional-jwt-auth.guard");
const JOB_TITLE_MAX_LENGTH = 35;
const jobTitleSchema = joi_1.default.string().trim().max(JOB_TITLE_MAX_LENGTH).messages({
    'string.max': 'Title cannot exceed 35 characters',
});
let JobController = class JobController {
    constructor(jobService) {
        this.jobService = jobService;
    }
    async createJob(body, req) {
        body.createdBy = req.user.id;
        return this.jobService.createJob(body, req.user.id);
    }
    async findJobs(query, req) {
        if (query.myjobs === 'true' && !req.user?.id) {
            throw new common_1.UnauthorizedException('Authentication is required for myjobs');
        }
        return this.jobService.findJobs(query, req.user?.id);
    }
    async findJob(id, req) {
        return this.jobService.findJobById(Number(id), req.user?.id);
    }
    async patchJob(id, body, req) {
        return this.jobService.updateJob(id, body, req.user.id);
    }
    async updateStatus(id, body, req) {
        return this.jobService.updateJobStatus(id, body.status, req.user.id);
    }
    async deleteJob(id, req) {
        return this.jobService.closeJob(id, req.user.id);
    }
};
exports.JobController = JobController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        title: jobTitleSchema.required(),
        filterId: joi_1.default.number().required(),
        description: joi_1.default.string().required(),
        pageId: joi_1.default.number().optional(),
        companyId: joi_1.default.number().allow(null).optional(),
        branchId: joi_1.default.number().allow(null).optional(),
        postingMode: joi_1.default.string().valid('individual', 'company').optional(),
        requirements: joi_1.default.string().optional(),
        benefits: joi_1.default.array().items(joi_1.default.string()).optional(),
        jobType: joi_1.default.string().optional(),
        shift: joi_1.default.string().optional(),
        working_hours: joi_1.default.string().optional(),
        shifts: joi_1.default.array().items(joi_1.default.string().valid('morning', 'evening', 'night', 'rotational')),
        jobTypes: joi_1.default.array().items(joi_1.default.string().valid('full-time', 'part-time', 'contract', 'temporary', 'freelance', 'internship')),
        salaryType: joi_1.default.string()
            .valid('piece-rate', 'daily-wage', 'hourly', 'monthly', 'fixed', 'commission', 'negotiable')
            .required(),
        salaryAmount: joi_1.default.number().required(),
        currency: joi_1.default.string().optional(),
        vacancies: joi_1.default.number().integer().min(1).optional(),
        isRemote: joi_1.default.boolean().optional(),
        status: joi_1.default.string().valid('draft', 'active', 'closed').optional(),
        location: joi_1.default.object({
            lat: joi_1.default.number().required(),
            lng: joi_1.default.number().required(),
        }).optional(),
        startDate: joi_1.default.date().optional(),
        endDate: joi_1.default.date().optional(),
        deadline: joi_1.default.date().optional(),
        industry: joi_1.default.string().optional(),
        educationLevel: joi_1.default.string().optional(),
        experienceRequired: joi_1.default.string().optional(),
        languageRequirements: joi_1.default.array().items(joi_1.default.string()).optional(),
        contactEmail: joi_1.default.string().email().optional(),
        contactPhone: joi_1.default.string().optional(),
    }))),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], JobController.prototype, "createJob", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(optional_jwt_auth_guard_1.OptionalJwtAuthGuard),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], JobController.prototype, "findJobs", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(optional_jwt_auth_guard_1.OptionalJwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], JobController.prototype, "findJob", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        title: jobTitleSchema.optional(),
        description: joi_1.default.string().optional(),
        pageId: joi_1.default.number().optional(),
        companyId: joi_1.default.number().allow(null).optional(),
        branchId: joi_1.default.number().allow(null).optional(),
        postingMode: joi_1.default.string().valid('individual', 'company').optional(),
        filterId: joi_1.default.number().optional(),
        requirements: joi_1.default.string().optional(),
        benefits: joi_1.default.array().items(joi_1.default.string()).optional(),
        jobType: joi_1.default.string().optional(),
        shift: joi_1.default.string().optional(),
        working_hours: joi_1.default.string().optional(),
        shifts: joi_1.default.array().items(joi_1.default.string().valid('morning', 'evening', 'night', 'rotational')),
        jobTypes: joi_1.default.array().items(joi_1.default.string().valid('full-time', 'part-time', 'contract', 'temporary', 'freelance', 'internship')),
        salaryType: joi_1.default.string()
            .valid('piece-rate', 'daily-wage', 'hourly', 'monthly', 'fixed', 'commission', 'negotiable')
            .optional(),
        salaryAmount: joi_1.default.number().optional(),
        currency: joi_1.default.string().optional(),
        vacancies: joi_1.default.number().integer().min(1).optional(),
        isRemote: joi_1.default.boolean().optional(),
        status: joi_1.default.string().valid('draft', 'active', 'closed').optional(),
        location: joi_1.default.object({
            lat: joi_1.default.number().required(),
            lng: joi_1.default.number().required(),
        }).optional(),
        startDate: joi_1.default.date().optional(),
        endDate: joi_1.default.date().optional(),
        deadline: joi_1.default.date().optional(),
        industry: joi_1.default.string().optional(),
        educationLevel: joi_1.default.string().optional(),
        experienceRequired: joi_1.default.string().optional(),
        languageRequirements: joi_1.default.array().items(joi_1.default.string()).optional(),
        contactEmail: joi_1.default.string().email().optional(),
        contactPhone: joi_1.default.string().optional(),
    })))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", Promise)
], JobController.prototype, "patchJob", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        status: joi_1.default.string().valid('draft', 'active', 'closed').required(),
    })))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", Promise)
], JobController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], JobController.prototype, "deleteJob", null);
exports.JobController = JobController = __decorate([
    (0, common_1.Controller)('job'),
    __metadata("design:paramtypes", [job_service_1.JobService])
], JobController);
//# sourceMappingURL=job.controller.js.map