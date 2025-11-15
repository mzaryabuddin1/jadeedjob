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
let JobController = class JobController {
    constructor(jobService) {
        this.jobService = jobService;
    }
    async createJob(body, req) {
        return this.jobService.createJob(body);
    }
    async findJobs(query) {
        return this.jobService.findJobs(query);
    }
    async findNearbyJobs(query) {
        return this.jobService.findNearbyJobs(query);
    }
};
exports.JobController = JobController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        filter: joi_1.default.number().required(),
        description: joi_1.default.string().required(),
        requirements: joi_1.default.string().optional(),
        benefits: joi_1.default.array().items(joi_1.default.string()).optional(),
        shifts: joi_1.default.array().items(joi_1.default.string().valid('morning', 'evening', 'night', 'rotational')),
        jobTypes: joi_1.default.array().items(joi_1.default.string().valid('full-time', 'part-time', 'contract', 'temporary', 'freelance', 'internship')),
        salaryType: joi_1.default.string()
            .valid('piece-rate', 'daily-wage', 'hourly', 'monthly', 'fixed', 'commission', 'negotiable')
            .required(),
        salaryAmount: joi_1.default.number().required(),
        currency: joi_1.default.string().optional(),
        location: joi_1.default.object({
            lat: joi_1.default.number().required(),
            lng: joi_1.default.number().required(),
        }).required(),
        startDate: joi_1.default.date().optional(),
        endDate: joi_1.default.date().optional(),
        industry: joi_1.default.string().optional(),
        educationLevel: joi_1.default.string().optional(),
        experienceRequired: joi_1.default.string().optional(),
        languageRequirements: joi_1.default.array().items(joi_1.default.string()).optional(),
    }))),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], JobController.prototype, "createJob", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], JobController.prototype, "findJobs", null);
__decorate([
    (0, common_1.Get)('nearby'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], JobController.prototype, "findNearbyJobs", null);
exports.JobController = JobController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('job'),
    __metadata("design:paramtypes", [job_service_1.JobService])
], JobController);
//# sourceMappingURL=job.controller.js.map