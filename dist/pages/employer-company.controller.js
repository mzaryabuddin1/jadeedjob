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
exports.EmployerCompanyController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const joi_1 = __importDefault(require("joi"));
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const pages_service_1 = require("./pages.service");
const permissionSchema = joi_1.default.object({
    postJobs: joi_1.default.boolean().optional(),
    editJobs: joi_1.default.boolean().optional(),
    viewApplicants: joi_1.default.boolean().optional(),
    chatApplicants: joi_1.default.boolean().optional(),
    manageTeam: joi_1.default.boolean().optional(),
    publishContent: joi_1.default.boolean().optional(),
});
const branchSchema = joi_1.default.object({
    label: joi_1.default.string().required(),
    address: joi_1.default.string().allow('', null).optional(),
    location: joi_1.default.alternatives()
        .try(joi_1.default.string().allow('', null), joi_1.default.object({
        lat: joi_1.default.number().required(),
        lng: joi_1.default.number().required(),
    }))
        .optional(),
    lat: joi_1.default.number().optional(),
    lng: joi_1.default.number().optional(),
});
let EmployerCompanyController = class EmployerCompanyController {
    constructor(pagesService) {
        this.pagesService = pagesService;
    }
    getAccounts(req) {
        return this.pagesService.getEmployerAccounts(req.user.id);
    }
    getCompanySelectOptions(req) {
        return this.pagesService.getEmployerCompanySelectOptions(req.user.id);
    }
    createCompany(body, files, idempotencyKey, req) {
        return this.pagesService.createEmployerCompany(req.user.id, body, files?.logo?.[0], files?.verificationDocument?.[0], idempotencyKey);
    }
    searchCompanies(query, req) {
        return this.pagesService.searchEmployerCompanies(req.user.id, query);
    }
    requestAccess(companyId, body, idempotencyKey, req) {
        return this.pagesService.requestCompanyAccess(companyId, req.user.id, {
            ...body,
            clientRequestId: String(idempotencyKey || '').trim() ||
                body.clientRequestId,
        });
    }
    getAccessRequests(companyId, query, req) {
        return this.pagesService.getCompanyAccessRequests(companyId, req.user.id, query);
    }
    reviewAccessRequest(requestId, body, req) {
        return this.pagesService.reviewCompanyAccessRequest(requestId, req.user.id, body);
    }
    resubmitVerification(companyId, body, files, req) {
        return this.pagesService.resubmitCompanyVerification(companyId, req.user.id, body, files?.verificationDocument?.[0]);
    }
    transferOwnership(companyId, body, req) {
        return this.pagesService.transferCompanyOwnership(companyId, req.user.id, body.newOwnerUserId, body.currentPassword);
    }
    getCompany(companyId, req) {
        return this.pagesService.getEmployerCompany(companyId, req.user.id);
    }
    updateCompany(companyId, body, req) {
        return this.pagesService.updateEmployerCompany(companyId, req.user.id, body);
    }
    createBranch(companyId, body, req) {
        return this.pagesService.createBranch(companyId, req.user.id, body);
    }
    updateBranch(companyId, branchId, body, req) {
        return this.pagesService.updateBranch(companyId, branchId, req.user.id, body);
    }
    deleteBranch(companyId, branchId, req) {
        return this.pagesService.deleteBranch(companyId, branchId, req.user.id);
    }
    getTeam(companyId, req) {
        return this.pagesService.getCompanyTeam(companyId, req.user.id);
    }
    inviteOrGrant(companyId, body, req) {
        return this.pagesService.inviteOrGrantCompanyTeamMember(companyId, req.user.id, body);
    }
    updateAccess(memberId, body, req) {
        return this.pagesService.updateCompanyTeamAccess(memberId, req.user.id, body.hasAccess);
    }
    updatePermissions(memberId, body, req) {
        return this.pagesService.updateCompanyTeamPermissions(memberId, req.user.id, body);
    }
};
exports.EmployerCompanyController = EmployerCompanyController;
__decorate([
    (0, common_1.Get)('accounts'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EmployerCompanyController.prototype, "getAccounts", null);
__decorate([
    (0, common_1.Get)('companies/select-options'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EmployerCompanyController.prototype, "getCompanySelectOptions", null);
__decorate([
    (0, common_1.Post)('companies'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: 'logo', maxCount: 1 },
        { name: 'verificationDocument', maxCount: 1 },
    ], {
        limits: {
            fileSize: 10 * 1024 * 1024,
            files: 2,
        },
    })),
    __param(0, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        company_name: joi_1.default.string().trim().max(160).required(),
        username: joi_1.default.string()
            .trim()
            .lowercase()
            .pattern(/^[a-z0-9.-]+$/)
            .max(100)
            .optional(),
        business_name: joi_1.default.string().trim().max(160).allow('', null).optional(),
        industry_type: joi_1.default.string().trim().max(120).allow('', null).optional(),
        company_description: joi_1.default.string().trim().max(4000).allow('', null).optional(),
        official_email: joi_1.default.string().email().allow('', null).optional(),
        official_phone: joi_1.default.string().trim().max(40).allow('', null).optional(),
        website_url: joi_1.default.string().uri().allow('', null).optional(),
        country: joi_1.default.string().trim().max(120).allow('', null).optional(),
        state: joi_1.default.string().trim().max(120).allow('', null).optional(),
        city: joi_1.default.string().trim().max(120).allow('', null).optional(),
        address_line1: joi_1.default.string().trim().max(255).allow('', null).optional(),
        business_registration_number: joi_1.default.string().trim().max(120).allow('', null).optional(),
        tax_identification_number: joi_1.default.string().trim().max(120).allow('', null).optional(),
        registration_authority: joi_1.default.string().trim().max(160).allow('', null).optional(),
        representative_name: joi_1.default.string().trim().max(160).allow('', null).optional(),
        representative_designation: joi_1.default.string().trim().max(120).allow('', null).optional(),
        representative_email: joi_1.default.string().email().allow('', null).optional(),
        representative_phone: joi_1.default.string().trim().max(40).allow('', null).optional(),
        verificationProofType: joi_1.default.string().trim().max(80).required(),
    })))),
    __param(1, (0, common_1.UploadedFiles)()),
    __param(2, (0, common_1.Headers)('idempotency-key')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, Object]),
    __metadata("design:returntype", void 0)
], EmployerCompanyController.prototype, "createCompany", null);
__decorate([
    (0, common_1.Get)('companies/search'),
    __param(0, (0, common_1.Query)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        q: joi_1.default.string().trim().min(2).max(80).required(),
        page: joi_1.default.number().integer().min(1).default(1),
        limit: joi_1.default.number().integer().min(1).max(30).default(20),
    })))),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], EmployerCompanyController.prototype, "searchCompanies", null);
__decorate([
    (0, common_1.Post)('companies/:companyId/access-requests'),
    __param(0, (0, common_1.Param)('companyId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        message: joi_1.default.string().trim().max(1000).allow('', null).optional(),
        requestedRole: joi_1.default.string().valid('admin', 'editor').default('editor'),
        clientRequestId: joi_1.default.string().trim().max(120).optional(),
    })))),
    __param(2, (0, common_1.Headers)('idempotency-key')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, String, Object]),
    __metadata("design:returntype", void 0)
], EmployerCompanyController.prototype, "requestAccess", null);
__decorate([
    (0, common_1.Get)('companies/:companyId/access-requests'),
    __param(0, (0, common_1.Param)('companyId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        status: joi_1.default.string()
            .valid('pending', 'approved', 'rejected', 'cancelled', 'all')
            .default('pending'),
        page: joi_1.default.number().integer().min(1).default(1),
        limit: joi_1.default.number().integer().min(1).max(100).default(20),
    })))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], EmployerCompanyController.prototype, "getAccessRequests", null);
__decorate([
    (0, common_1.Patch)('company-access-requests/:requestId'),
    __param(0, (0, common_1.Param)('requestId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        action: joi_1.default.string().valid('approve', 'reject').required(),
        role: joi_1.default.string().valid('admin', 'editor').optional(),
        permissions: permissionSchema.optional(),
        reason: joi_1.default.string().trim().max(1000).allow('', null).optional(),
    })))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], EmployerCompanyController.prototype, "reviewAccessRequest", null);
__decorate([
    (0, common_1.Post)('companies/:companyId/verification-submissions'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([{ name: 'verificationDocument', maxCount: 1 }], { limits: { fileSize: 10 * 1024 * 1024, files: 1 } })),
    __param(0, (0, common_1.Param)('companyId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        verificationProofType: joi_1.default.string().trim().max(80).required(),
        message: joi_1.default.string().trim().max(2000).allow('', null).optional(),
    })))),
    __param(2, (0, common_1.UploadedFiles)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], EmployerCompanyController.prototype, "resubmitVerification", null);
__decorate([
    (0, common_1.Post)('companies/:companyId/ownership-transfer'),
    __param(0, (0, common_1.Param)('companyId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        newOwnerUserId: joi_1.default.number().integer().positive().required(),
        currentPassword: joi_1.default.string().min(1).required(),
    })))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], EmployerCompanyController.prototype, "transferOwnership", null);
__decorate([
    (0, common_1.Get)('companies/:companyId'),
    __param(0, (0, common_1.Param)('companyId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], EmployerCompanyController.prototype, "getCompany", null);
__decorate([
    (0, common_1.Patch)('companies/:companyId'),
    __param(0, (0, common_1.Param)('companyId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        name: joi_1.default.string().optional(),
        logoUrl: joi_1.default.string().allow('', null).optional(),
        description: joi_1.default.string().allow('', null).optional(),
        website: joi_1.default.string().allow('', null).optional(),
        socials: joi_1.default.object({
            linkedin: joi_1.default.string().allow('', null).optional(),
            facebook: joi_1.default.string().allow('', null).optional(),
            instagram: joi_1.default.string().allow('', null).optional(),
            twitter: joi_1.default.string().allow('', null).optional(),
            youtube: joi_1.default.string().allow('', null).optional(),
        }).optional(),
        company_name: joi_1.default.string().optional(),
        business_name: joi_1.default.string().allow('', null).optional(),
        company_logo: joi_1.default.string().allow('', null).optional(),
        website_url: joi_1.default.string().allow('', null).optional(),
        official_email: joi_1.default.string().email().allow('', null).optional(),
        official_phone: joi_1.default.string().allow('', null).optional(),
        industry_type: joi_1.default.string().allow('', null).optional(),
        company_description: joi_1.default.string().allow('', null).optional(),
        country: joi_1.default.string().allow('', null).optional(),
        state: joi_1.default.string().allow('', null).optional(),
        city: joi_1.default.string().allow('', null).optional(),
        address_line1: joi_1.default.string().allow('', null).optional(),
        address_line2: joi_1.default.string().allow('', null).optional(),
    })))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], EmployerCompanyController.prototype, "updateCompany", null);
__decorate([
    (0, common_1.Post)('companies/:companyId/branches'),
    __param(0, (0, common_1.Param)('companyId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(branchSchema))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], EmployerCompanyController.prototype, "createBranch", null);
__decorate([
    (0, common_1.Patch)('companies/:companyId/branches/:branchId'),
    __param(0, (0, common_1.Param)('companyId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('branchId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(branchSchema.fork(['label'], (schema) => schema.optional())))),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object, Object]),
    __metadata("design:returntype", void 0)
], EmployerCompanyController.prototype, "updateBranch", null);
__decorate([
    (0, common_1.Delete)('companies/:companyId/branches/:branchId'),
    __param(0, (0, common_1.Param)('companyId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('branchId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", void 0)
], EmployerCompanyController.prototype, "deleteBranch", null);
__decorate([
    (0, common_1.Get)('companies/:companyId/team'),
    __param(0, (0, common_1.Param)('companyId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], EmployerCompanyController.prototype, "getTeam", null);
__decorate([
    (0, common_1.Post)('companies/:companyId/team/invite-or-grant'),
    __param(0, (0, common_1.Param)('companyId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        userId: joi_1.default.number().integer().positive().optional(),
        phone: joi_1.default.string().optional(),
        roleType: joi_1.default.string().valid('admin', 'editor').default('editor'),
        role: joi_1.default.string().valid('admin', 'editor').optional(),
        hasAccess: joi_1.default.boolean().default(true),
        permissions: permissionSchema.optional(),
    }).or('userId', 'phone')))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], EmployerCompanyController.prototype, "inviteOrGrant", null);
__decorate([
    (0, common_1.Patch)('company-team/:memberId/access'),
    __param(0, (0, common_1.Param)('memberId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        hasAccess: joi_1.default.boolean().required(),
    })))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], EmployerCompanyController.prototype, "updateAccess", null);
__decorate([
    (0, common_1.Patch)('company-team/:memberId/permissions'),
    __param(0, (0, common_1.Param)('memberId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(permissionSchema))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], EmployerCompanyController.prototype, "updatePermissions", null);
exports.EmployerCompanyController = EmployerCompanyController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('employer'),
    __metadata("design:paramtypes", [pages_service_1.PagesService])
], EmployerCompanyController);
//# sourceMappingURL=employer-company.controller.js.map