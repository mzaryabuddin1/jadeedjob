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
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const job_service_1 = require("./job.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const files_service_1 = require("../files/files.service");
const job_validation_1 = require("./job.validation");
const multer_1 = require("multer");
const path_1 = require("path");
const imageFileFilter = (_req, file, cb) => {
    if (!file.mimetype?.match(/^image\/(jpeg|jpg|png|webp|gif)$/)) {
        return cb(new Error('Only image files are allowed (jpeg, png, webp, gif)'), false);
    }
    cb(null, true);
};
const picturesMulter = {
    storage: (0, multer_1.diskStorage)({
        destination: './uploads',
        filename: (_req, file, callback) => {
            const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${(0, path_1.extname)(file.originalname)}`;
            callback(null, uniqueName);
        },
    }),
    fileFilter: imageFileFilter,
    limits: { files: 4, fileSize: 5 * 1024 * 1024 },
};
function validateBody(schema, body) {
    const { error, value } = schema.validate(body, {
        abortEarly: false,
        stripUnknown: true,
    });
    if (error) {
        throw new common_1.BadRequestException({
            message: 'Validation failed',
            errors: error.details.map((err) => err.message),
        });
    }
    return value;
}
function mergePictures(urlsFromBody, files, filesService) {
    const urls = [...(urlsFromBody || [])];
    if (files?.length) {
        for (const f of files) {
            urls.push(filesService.getFileUrl(f.filename));
        }
    }
    if (urls.length > 4) {
        throw new common_1.BadRequestException('Maximum 4 pictures allowed');
    }
    return urls.length ? urls : undefined;
}
const jobBodyProperties = {
    title: { type: 'string', example: 'Warehouse Helper' },
    filterIds: {
        type: 'array',
        items: { type: 'number' },
        example: [1, 11, 17],
        description: 'One or more filter category ids (preferred, max 10)',
    },
    filterId: {
        type: 'number',
        example: 1,
        description: 'Legacy input alias for `filterIds: [id]` — use filterIds instead',
    },
    description: {
        type: 'string',
        example: 'Need helpers for loading',
        nullable: true,
        description: 'Optional',
    },
    isRemote: {
        type: 'boolean',
        example: false,
        description: 'If true, location is optional; otherwise location is required',
    },
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
        nullable: true,
        properties: {
            lat: { type: 'number', example: 24.8607 },
            lng: { type: 'number', example: 67.0011 },
        },
        description: 'Required when isRemote is false; optional when remote',
    },
    pictures: {
        type: 'array',
        items: { type: 'string', format: 'binary' },
        maxItems: 4,
        description: 'Optional image files (max 4). Or send picture URLs as JSON array.',
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
};
let JobController = class JobController {
    constructor(jobService, filesService) {
        this.jobService = jobService;
        this.filesService = filesService;
    }
    async createJob(files, body, req) {
        const raw = body && Object.keys(body).length ? body : {};
        const parsed = (0, job_validation_1.parseJobBody)(raw);
        const data = validateBody(job_validation_1.createJobSchema, parsed);
        const pictures = mergePictures(Array.isArray(data.pictures) && data.pictures.length
            ? data.pictures
            : undefined, files, this.filesService);
        return this.jobService.createJob({
            ...data,
            pageId: data.pageId ?? data.companyId ?? undefined,
            pictures: pictures ?? null,
            description: data.description || null,
            createdBy: req.user.id,
        }, req.user.id);
    }
    async findJobs(query, req) {
        return this.jobService.findJobs(query, req.user.id);
    }
    async findJob(id) {
        return this.jobService.findJobById(id);
    }
    async patchJob(id, files, body, req) {
        const parsed = (0, job_validation_1.parseJobBody)(body);
        const data = validateBody(job_validation_1.updateJobSchema, parsed);
        const hasPictureInput = data.pictures !== undefined || (files && files.length > 0);
        if (hasPictureInput) {
            data.pictures =
                mergePictures(data.pictures, files, this.filesService) ?? [];
        }
        if (data.isRemote === true && data.location === undefined) {
        }
        if (data.isRemote === false && data.location !== undefined) {
        }
        return this.jobService.updateJob(id, data, req.user.id);
    }
};
exports.JobController = JobController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Create job',
        description: [
            '- **Categories:** `filterIds` (1–10). All are saved in the `job_filters` table (legacy `filterId` input = one-item `filterIds`)',
            '- Response returns `filterIds` and `filters` (`{ id, name, icon }` each)',
            '- **Pictures:** optional, max **4** images (`multipart` field `pictures`) or URL array',
            '- **Remote:** `isRemote: true` → `location` optional; otherwise `location` required',
            '- **Description:** optional',
            '- Other fields remain optional',
        ].join('\n'),
    }),
    (0, swagger_1.ApiConsumes)('multipart/form-data', 'application/json'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['title', 'salaryType', 'salaryAmount'],
            properties: jobBodyProperties,
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('pictures', 4, picturesMulter)),
    __param(0, (0, common_1.UploadedFiles)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object, Object]),
    __metadata("design:returntype", Promise)
], JobController.prototype, "createJob", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'List jobs',
        description: [
            'Every job includes `filterIds` and `filters` (all categories as `{ id, name, icon }`). `icon` is `{ type: "tabler", name }` or `{ type: "custom", svg }`.',
            '- **My jobs:** `myjobs=true` → only jobs created by the logged-in user (active + inactive)',
            '- **Nearby:** send `lat` + `lng` → adds `distance` (meters; null for remote jobs). Add `radiusKm` to limit results to that radius — without it, no radius filter is applied',
            '- **Category:** `filter=11` or `filter=1,11,17` → jobs tagged with any of these',
        ].join('\n'),
    }),
    (0, swagger_1.ApiQuery)({ name: 'myjobs', required: false, type: Boolean, example: true }),
    (0, swagger_1.ApiQuery)({
        name: 'filter',
        required: false,
        type: String,
        example: '1,11',
        description: 'Single category id or comma-separated ids',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'search',
        required: false,
        type: String,
        description: 'Matches job description',
    }),
    (0, swagger_1.ApiQuery)({ name: 'lat', required: false, type: Number, example: 24.8607 }),
    (0, swagger_1.ApiQuery)({ name: 'lng', required: false, type: Number, example: 67.0011 }),
    (0, swagger_1.ApiQuery)({
        name: 'radiusKm',
        required: false,
        type: Number,
        example: 1,
        description: 'Optional, only with lat/lng. If sent, only jobs within this radius are returned. If omitted, no radius filter is applied.',
    }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, example: 1 }),
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        type: Number,
        example: 10,
        description: 'Max 100',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'sortBy',
        required: false,
        enum: [
            'createdAt',
            'updatedAt',
            'title',
            'salaryAmount',
            'startDate',
            'endDate',
            'id',
            'distance',
        ],
        description: '`distance` only with lat/lng',
    }),
    (0, swagger_1.ApiQuery)({ name: 'sortOrder', required: false, enum: ['DESC', 'ASC'] }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], JobController.prototype, "findJobs", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get job by id',
        description: 'Response includes `filterIds` and `filters` (`{ id, name, icon }` for every category).',
    }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], JobController.prototype, "findJob", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update job',
        description: [
            'Partial update. Same rules as create:',
            '- `filterIds` / `filterId` to replace categories',
            '- `isRemote: true` clears requirement for location (sets remote)',
            '- `pictures` files or URLs replace existing (max 4)',
        ].join('\n'),
    }),
    (0, swagger_1.ApiConsumes)('multipart/form-data', 'application/json'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: jobBodyProperties,
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('pictures', 4, picturesMulter)),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.UploadedFiles)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Array, Object, Object]),
    __metadata("design:returntype", Promise)
], JobController.prototype, "patchJob", null);
exports.JobController = JobController = __decorate([
    (0, swagger_1.ApiTags)('Jobs'),
    (0, swagger_1.ApiBearerAuth)('JWT'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('job'),
    __metadata("design:paramtypes", [job_service_1.JobService,
        files_service_1.FilesService])
], JobController);
//# sourceMappingURL=job.controller.js.map