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
exports.RatingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const rating_service_1 = require("./rating.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const joi_1 = __importDefault(require("joi"));
let RatingController = class RatingController {
    constructor(ratingService) {
        this.ratingService = ratingService;
    }
    async rate(body, req) {
        return this.ratingService.rateUser(req.user.id, body.jobApplicationId, body.stars, body.comment ?? '');
    }
    async applicationState(applicationId, req) {
        return this.ratingService.getApplicationRatingState(applicationId, req.user.id);
    }
    async userSummary(userId, limit = '10') {
        return this.ratingService.getUserSummary(userId, Number(limit) || 10);
    }
    async companySummary(pageId, limit = '10') {
        return this.ratingService.getCompanySummary(pageId, Number(limit) || 10);
    }
};
exports.RatingController = RatingController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Rate the other side of an accepted application',
        description: [
            'Only after the employer **accepted** the application, and **once per side**:',
            '- the **applicant (employee)** rates the employer side',
            '- the **employer side** (job poster, or company page owner/admin/editor) rates the applicant',
            '',
            'Where the rating lands:',
            "- rating an **applicant** → the applicant's **profile rating** (`users.ratingAverage`)",
            "- employee rating a **personal job's poster** → the poster's **profile rating**",
            '- employee rating a job posted **under a company page** → the **company rating** (`pages.company_rating`), not the person',
            '',
            'A profile rating is the average of ALL ratings the person received, as employee and as employer together.',
        ].join('\n'),
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['jobApplicationId', 'stars'],
            properties: {
                jobApplicationId: { type: 'number', example: 1 },
                stars: { type: 'number', minimum: 1, maximum: 5, example: 5 },
                comment: { type: 'string', example: 'Great work!' },
            },
        },
    }),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        jobApplicationId: joi_1.default.number().required(),
        stars: joi_1.default.number().integer().min(1).max(5).required(),
        comment: joi_1.default.string().allow('').optional(),
    }))),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RatingController.prototype, "rate", null);
__decorate([
    (0, common_1.Get)('application/:applicationId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Can I rate on this application? (rating screen state)',
        description: 'For the applicant or the employer side of the application: `myRole` (employee/employer), who `willRate` (user or company), `canRate`, `iRated`, `otherSideRated`. 403 if you are not part of the application.',
    }),
    __param(0, (0, common_1.Param)('applicationId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], RatingController.prototype, "applicationState", null);
__decorate([
    (0, common_1.Get)('user/:userId'),
    (0, swagger_1.ApiOperation)({
        summary: 'User rating summary',
        description: '`average`/`count` = all ratings the person received (employee + employer roles pooled). `asEmployee` = rated by employers, `asEmployer` = rated by employees of jobs they posted personally (jobs under a company page count for the company instead).',
    }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, example: 10 }),
    __param(0, (0, common_1.Param)('userId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], RatingController.prototype, "userSummary", null);
__decorate([
    (0, common_1.Get)('company/:pageId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Company rating summary',
        description: 'Average of the ratings employees gave this company for jobs posted under its page.',
    }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, example: 10 }),
    __param(0, (0, common_1.Param)('pageId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], RatingController.prototype, "companySummary", null);
exports.RatingController = RatingController = __decorate([
    (0, swagger_1.ApiTags)('Ratings'),
    (0, swagger_1.ApiBearerAuth)('JWT'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('ratings'),
    __metadata("design:paramtypes", [rating_service_1.RatingService])
], RatingController);
//# sourceMappingURL=rating.controller.js.map