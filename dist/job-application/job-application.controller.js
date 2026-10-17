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
const swagger_1 = require("@nestjs/swagger");
const job_application_service_1 = require("./job-application.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const joi_1 = __importDefault(require("joi"));
let JobApplicationController = class JobApplicationController {
    constructor(jobAppService) {
        this.jobAppService = jobAppService;
    }
    async apply(body, req) {
        return this.jobAppService.apply({
            jobId: Number(body.job),
            applicantId: req.user.id,
        });
    }
    async getMyApplications(req, page = 1, limit = 10) {
        return this.jobAppService.getApplicationsByUser(req.user.id, +page, +limit);
    }
    async getByJob(jobId, req) {
        return this.jobAppService.getApplicationsByJob(jobId, req.user.id);
    }
    async updateStatus(id, body, req) {
        return this.jobAppService.updateStatus(id, body.status, req.user.id);
    }
};
exports.JobApplicationController = JobApplicationController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Apply to a job',
        description: [
            'A user can apply **once** per job (400 `You already applied to this job`), and not to their own job.',
            'The job owner is **not** pinged instantly: applications are queued and merged into ONE notification after ~30 seconds,',
            'e.g. `3 people applied to your job "X" (12 total)`. Busy jobs are spaced out (at least 2 min between notifications).',
            "Push/email follow the owner's `notification-settings`. Push `data`: `type=job_application, jobId, jobTitle, title, text, count, totalApplications, applicantIds, applicantNames, applicationId, createdAt, path`.",
        ].join('\n'),
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['job'],
            properties: { job: { type: 'number', example: 1 } },
        },
    }),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        job: joi_1.default.number().required(),
    }))),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], JobApplicationController.prototype, "apply", null);
__decorate([
    (0, common_1.Get)('my'),
    (0, swagger_1.ApiOperation)({ summary: 'My applications' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], JobApplicationController.prototype, "getMyApplications", null);
__decorate([
    (0, common_1.Get)('job/:jobId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Applications for a job (employer only)',
        description: 'Only the employer side may call this: the user who posted the job, or - for a job posted under a page - the page owner / admin / editor (403 otherwise). Applicant objects never include private fields (password hash, FCM tokens, bank details...).',
    }),
    __param(0, (0, common_1.Param)('jobId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], JobApplicationController.prototype, "getByJob", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, swagger_1.ApiOperation)({
        summary: 'Accept or reject an application (employer only)',
        description: [
            'Only the employer side (job poster, or page owner/admin/editor) can decide; 403 otherwise.',
            'Only a **pending** application can be decided and the decision is **final**.',
            '**accepted** → the applicant gets a push/email notification (per their notification settings) and **both sides can now rate each other** (`POST /ratings`). **rejected** → no notification.',
            'Push `data` for accepted: `type=application_accepted, applicationId, jobId, jobTitle, title, text, pageName, pageId, createdAt, path` (`path` from env `NOTIFICATION_APPLICATION_ACCEPTED_PATH`, `{id}` = application id, default `/application/{id}`).',
        ].join('\n'),
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['status'],
            properties: {
                status: {
                    type: 'string',
                    enum: ['accepted', 'rejected'],
                    example: 'accepted',
                },
            },
        },
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        status: joi_1.default.string().valid('accepted', 'rejected').required(),
    })))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", Promise)
], JobApplicationController.prototype, "updateStatus", null);
exports.JobApplicationController = JobApplicationController = __decorate([
    (0, swagger_1.ApiTags)('Job Applications'),
    (0, swagger_1.ApiBearerAuth)('JWT'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('job-application'),
    __metadata("design:paramtypes", [job_application_service_1.JobApplicationService])
], JobApplicationController);
//# sourceMappingURL=job-application.controller.js.map