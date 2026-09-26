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
const swagger_1 = require("@nestjs/swagger");
const job_service_1 = require("./job.service");
const joi_1 = __importDefault(require("joi"));
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let JobController = class JobController {
    constructor(jobService) {
        this.jobService = jobService;
    }
    async createJob(body, req) {
        body.createdBy = req.user.id;
        return this.jobService.createJob(body, req.user.id);
    }
    async findJobs(query, req) {
        return this.jobService.findJobs(query, req.user.id);
    }
    async findJob(id) {
        return this.jobService.findJobById(id);
    }
    async patchJob(id, body, req) {
        return this.jobService.updateJob(id, body, req.user.id);
    }
};
exports.JobController = JobController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create job' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: [
                'title',
                'filterId',
                'description',
                'salaryType',
                'salaryAmount',
                'location',
            ],
            properties: {
                title: { type: 'string', example: 'Warehouse Helper' },
                filterId: { type: 'number', example: 1 },
                description: { type: 'string', example: 'Need helpers for loading' },
                pageId: { type: 'number', nullable: true },
                requirements: { type: 'string' },
                benefits: { type: 'array', items: { type: 'string' }, example: ['Meals'] },
                shifts: {
                    type: 'array',
                    items: {
                        type: 'string',
                        enum: ['morning', 'evening', 'night', 'rotational'],
                    },
                },
                jobTypes: {
                    type: 'array',
                    items: {
                        type: 'string',
                        enum: [
                            'full-time',
                            'part-time',
                            'contract',
                            'temporary',
                            'freelance',
                            'internship',
                        ],
                    },
                },
                salaryType: {
                    type: 'string',
                    enum: [
                        'piece-rate',
                        'daily-wage',
                        'hourly',
                        'monthly',
                        'fixed',
                        'commission',
                        'negotiable',
                    ],
                    example: 'daily-wage',
                },
                salaryAmount: { type: 'number', example: 1500 },
                currency: { type: 'string', example: 'PKR' },
                location: {
                    type: 'object',
                    properties: {
                        lat: { type: 'number', example: 24.8607 },
                        lng: { type: 'number', example: 67.0011 },
                    },
                },
                startDate: { type: 'string', format: 'date' },
                endDate: { type: 'string', format: 'date' },
                industry: { type: 'string' },
                educationLevel: { type: 'string' },
                experienceRequired: { type: 'string' },
                languageRequirements: {
                    type: 'array',
                    items: { type: 'string' },
                },
            },
        },
    }),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        title: joi_1.default.string().required(),
        filterId: joi_1.default.number().required(),
        description: joi_1.default.string().required(),
        pageId: joi_1.default.number().optional(),
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
    (0, swagger_1.ApiOperation)({ summary: 'List jobs' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], JobController.prototype, "findJobs", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get job by id' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], JobController.prototype, "findJob", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update job' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        title: joi_1.default.string().optional(),
        description: joi_1.default.string().optional(),
        pageId: joi_1.default.number().optional(),
        filterId: joi_1.default.number().optional(),
        requirements: joi_1.default.string().optional(),
        benefits: joi_1.default.array().items(joi_1.default.string()).optional(),
        shifts: joi_1.default.array().items(joi_1.default.string().valid('morning', 'evening', 'night', 'rotational')),
        jobTypes: joi_1.default.array().items(joi_1.default.string().valid('full-time', 'part-time', 'contract', 'temporary', 'freelance', 'internship')),
        salaryType: joi_1.default.string()
            .valid('piece-rate', 'daily-wage', 'hourly', 'monthly', 'fixed', 'commission', 'negotiable')
            .optional(),
        salaryAmount: joi_1.default.number().optional(),
        currency: joi_1.default.string().optional(),
        location: joi_1.default.object({
            lat: joi_1.default.number().required(),
            lng: joi_1.default.number().required(),
        }).optional(),
        startDate: joi_1.default.date().optional(),
        endDate: joi_1.default.date().optional(),
        industry: joi_1.default.string().optional(),
        educationLevel: joi_1.default.string().optional(),
        experienceRequired: joi_1.default.string().optional(),
        languageRequirements: joi_1.default.array().items(joi_1.default.string()).optional(),
    })))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", Promise)
], JobController.prototype, "patchJob", null);
exports.JobController = JobController = __decorate([
    (0, swagger_1.ApiTags)('Jobs'),
    (0, swagger_1.ApiBearerAuth)('JWT'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('job'),
    __metadata("design:paramtypes", [job_service_1.JobService])
], JobController);
//# sourceMappingURL=job.controller.js.map