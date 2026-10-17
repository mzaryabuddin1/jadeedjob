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
exports.PagesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const multer_1 = require("multer");
const path_1 = require("path");
const joi_1 = __importDefault(require("joi"));
const pages_service_1 = require("./pages.service");
const page_invitations_service_1 = require("./page-invitations.service");
const page_verification_service_1 = require("./page-verification.service");
const page_verification_entity_1 = require("./entities/page-verification.entity");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const str = () => joi_1.default.string().trim();
const profileFields = {
    business_name: str().max(150),
    page_logo: str().max(500),
    website_url: joi_1.default.string().uri(),
    official_email: joi_1.default.string().email(),
    official_phone: str().max(40),
    industry_type: str().max(100),
    page_description: joi_1.default.string().max(5000),
    founded_year: joi_1.default.number().integer().min(1800).max(new Date().getFullYear()),
    country: str().max(100),
    state: str().max(100),
    city: str().max(100),
    postal_code: str().max(20),
    address_line1: str().max(200),
    address_line2: str().max(200),
    google_maps_link: str().max(500),
    business_registration_number: str().max(100),
    tax_identification_number: str().max(100),
    registration_authority: str().max(150),
    business_license_document: str().max(500),
    page_type: str().max(100),
    representative_name: str().max(150),
    representative_designation: str().max(100),
    representative_email: joi_1.default.string().email(),
    representative_phone: str().max(40),
    id_proof_document: str().max(500),
    linkedin_page_url: str().max(300),
    facebook_page_url: str().max(300),
    instagram_page_url: str().max(300),
    twitter_page_url: str().max(300),
    youtube_channel_url: str().max(300),
    verified_email_domain: str().max(150),
    number_of_employees: joi_1.default.number().integer().min(0),
    annual_revenue_range: str().max(100),
    client_list: joi_1.default.array().items(joi_1.default.string()),
    certifications: joi_1.default.array().items(joi_1.default.string()),
};
const usernameRule = joi_1.default.string().trim().lowercase();
const createPageSchema = joi_1.default.object({
    page_name: str().min(2).max(120).required(),
    username: usernameRule,
    ...profileFields,
});
const updatePageSchema = joi_1.default.object({
    page_name: str().min(2).max(120),
    username: usernameRule,
    ...profileFields,
}).min(1);
const inviteSchema = joi_1.default.object({
    userId: joi_1.default.number().integer().positive(),
    username: joi_1.default.string().trim(),
    role: joi_1.default.string().valid('admin', 'editor').required(),
})
    .or('userId', 'username')
    .messages({ 'object.missing': 'Send userId or username of the person' });
const roleSchema = joi_1.default.object({
    role: joi_1.default.string().valid('admin', 'editor').required(),
});
const pageProperties = {
    page_name: { type: 'string', example: 'Acme Traders' },
    username: {
        type: 'string',
        example: 'acme-traders',
        description: 'Unique page handle (3-40: a-z, 0-9, dot, dash). Auto-generated from the name when omitted',
    },
    business_name: { type: 'string' },
    page_logo: { type: 'string', example: 'https://.../logo.png' },
    website_url: { type: 'string', example: 'https://acme.com' },
    official_email: { type: 'string', example: 'hr@acme.com' },
    official_phone: { type: 'string' },
    industry_type: { type: 'string', example: 'Logistics' },
    page_description: { type: 'string' },
    founded_year: { type: 'number', example: 2015 },
    country: { type: 'string' },
    state: { type: 'string' },
    city: { type: 'string' },
    postal_code: { type: 'string' },
    address_line1: { type: 'string' },
    address_line2: { type: 'string' },
    google_maps_link: { type: 'string' },
    page_type: { type: 'string', example: 'Private Limited' },
    business_registration_number: {
        type: 'string',
        description: 'Private: only owner/admin see it',
    },
    tax_identification_number: { type: 'string', description: 'Private' },
    registration_authority: { type: 'string', description: 'Private' },
    representative_name: { type: 'string', description: 'Private' },
    representative_designation: { type: 'string', description: 'Private' },
    representative_email: { type: 'string', description: 'Private' },
    representative_phone: { type: 'string', description: 'Private' },
    linkedin_page_url: { type: 'string' },
    facebook_page_url: { type: 'string' },
    instagram_page_url: { type: 'string' },
    twitter_page_url: { type: 'string' },
    youtube_channel_url: { type: 'string' },
    number_of_employees: { type: 'number' },
    annual_revenue_range: { type: 'string', description: 'Private' },
    client_list: { type: 'array', items: { type: 'string' } },
    certifications: { type: 'array', items: { type: 'string' } },
};
const verificationUpload = {
    storage: (0, multer_1.diskStorage)({
        destination: page_verification_service_1.PRIVATE_UPLOAD_DIR,
        filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${(0, path_1.extname)(file.originalname).toLowerCase()}`),
    }),
    fileFilter: (_req, file, cb) => {
        if (!/^(application\/pdf|image\/(jpeg|png|webp))$/.test(file.mimetype)) {
            return cb(new common_1.BadRequestException('Only PDF, JPG, PNG or WEBP files are allowed'), false);
        }
        cb(null, true);
    },
    limits: { files: 5, fileSize: 10 * 1024 * 1024 },
};
let PagesController = class PagesController {
    constructor(pagesService, invitations, verification) {
        this.pagesService = pagesService;
        this.invitations = invitations;
        this.verification = verification;
    }
    roles() {
        return this.pagesService.getRoles();
    }
    myInvitations(req) {
        return this.invitations.listMine(req.user.id);
    }
    acceptInvitation(invitationId, req) {
        return this.invitations.accept(invitationId, req.user.id);
    }
    declineInvitation(invitationId, req) {
        return this.invitations.decline(invitationId, req.user.id);
    }
    createPage(body, req) {
        return this.pagesService.createPage(body, req.user.id);
    }
    getPages(query, req) {
        return this.pagesService.getPages(query, req.user.id);
    }
    getPageById(id, req) {
        return this.pagesService.getPageById(id, req.user.id);
    }
    updatePage(id, body, req) {
        return this.pagesService.updatePage(id, body, req.user.id);
    }
    deletePage(id, req) {
        return this.pagesService.deletePage(id, req.user.id);
    }
    members(pageId, req) {
        return this.pagesService.listMembers(pageId, req.user.id);
    }
    addMember(pageId, body, req) {
        return this.invitations.invite(pageId, req.user.id, body, body.role);
    }
    changeMemberRole(pageId, userId, body, req) {
        return this.pagesService.changeMemberRole(pageId, userId, body.role, req.user.id);
    }
    leave(pageId, req) {
        return this.pagesService.leavePage(pageId, req.user.id);
    }
    removeMember(pageId, userId, req) {
        return this.pagesService.removeMember(pageId, userId, req.user.id);
    }
    invite(pageId, body, req) {
        return this.invitations.invite(pageId, req.user.id, body, body.role);
    }
    pageInvitations(pageId, req) {
        return this.invitations.listForPage(pageId, req.user.id);
    }
    cancelInvitation(pageId, invitationId, req) {
        return this.invitations.cancel(pageId, invitationId, req.user.id);
    }
    async submitVerification(pageId, files, body, req) {
        const uploaded = files ?? [];
        try {
            const { page } = await this.pagesService.requirePermission(pageId, req.user.id, 'verification.submit', 'request verification');
            return await this.verification.submit(page, req.user.id, uploaded, body);
        }
        catch (err) {
            await this.verification.discardUploads(uploaded);
            throw err;
        }
    }
    async verificationStatus(pageId, req) {
        const { page } = await this.pagesService.requirePermission(pageId, req.user.id, 'verification.view', 'see the verification status');
        return this.verification.getStatus(page);
    }
};
exports.PagesController = PagesController;
__decorate([
    (0, common_1.Get)('roles'),
    (0, swagger_1.ApiOperation)({
        summary: 'Page roles and what each can do',
        description: 'owner / admin / editor with their permissions, plus the extra rules. Use it to build the "manage access" screen.',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PagesController.prototype, "roles", null);
__decorate([
    (0, common_1.Get)('invitations/me'),
    (0, swagger_1.ApiOperation)({
        summary: 'My pending page invitations',
        description: 'Invitations other pages sent me. Accept or decline each one.',
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PagesController.prototype, "myInvitations", null);
__decorate([
    (0, common_1.Post)('invitations/:invitationId/accept'),
    (0, swagger_1.ApiOperation)({
        summary: 'Accept a page invitation (only the invited user can)',
        description: 'This is what grants the access: the user becomes a member with the invited role. The inviter gets a notification.',
    }),
    __param(0, (0, common_1.Param)('invitationId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], PagesController.prototype, "acceptInvitation", null);
__decorate([
    (0, common_1.Post)('invitations/:invitationId/decline'),
    (0, swagger_1.ApiOperation)({ summary: 'Decline a page invitation' }),
    __param(0, (0, common_1.Param)('invitationId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], PagesController.prototype, "declineInvitation", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Create a page',
        description: 'A page is the company profile on JobsLoot. The creator becomes its **owner**. Jobs can then be posted under the page (`pageId`) or individually.',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['page_name'],
            properties: pageProperties,
        },
    }),
    __param(0, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(createPageSchema))),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PagesController.prototype, "createPage", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'List / search pages',
        description: 'Public profile fields only (+ `is_verified`). Each item has `myRole` / `permissions` for the caller. `mine=true` = pages I own or belong to.',
    }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'mine', required: false, type: Boolean }),
    (0, swagger_1.ApiQuery)({ name: 'verified', required: false, type: Boolean }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, example: 1 }),
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        example: 20,
        description: 'max 50',
    }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PagesController.prototype, "getPages", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get a page',
        description: "Public profile for everybody. Owner/admin also get the private business details and `verification_status`. Always includes the caller's `myRole` and `permissions`.",
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], PagesController.prototype, "getPageById", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Edit a page (owner / admin)',
        description: 'Profile fields only. Ratings, owner and the verified tick cannot be edited here.',
    }),
    (0, swagger_1.ApiBody)({ schema: { type: 'object', properties: pageProperties } }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(updatePageSchema))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], PagesController.prototype, "updatePage", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Delete a page (owner only)',
        description: "The page's jobs are kept but deactivated and become personal jobs of their poster; members, invitations, verification documents and page ratings are removed.",
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], PagesController.prototype, "deletePage", null);
__decorate([
    (0, common_1.Get)(':pageId/members'),
    (0, swagger_1.ApiOperation)({
        summary: 'Members of a page (any member)',
        description: 'Owner first, then admins and editors with name, username and role.',
    }),
    __param(0, (0, common_1.Param)('pageId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], PagesController.prototype, "members", null);
__decorate([
    (0, common_1.Post)(':pageId/members'),
    (0, swagger_1.ApiOperation)({
        summary: 'Give someone access (sends an invitation)',
        description: '**Deprecated alias of `POST /pages/:pageId/invitations`.** Nobody is added directly: the user gets an invitation and must accept it.',
        deprecated: true,
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['role'],
            properties: {
                userId: { type: 'number', example: 2 },
                username: { type: 'string', example: 'alikhan_k3f9a' },
                role: { type: 'string', enum: ['admin', 'editor'], example: 'editor' },
            },
        },
    }),
    __param(0, (0, common_1.Param)('pageId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(inviteSchema))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], PagesController.prototype, "addMember", null);
__decorate([
    (0, common_1.Patch)(':pageId/members/:userId/role'),
    (0, swagger_1.ApiOperation)({
        summary: "Change a member's role (owner only)",
        description: 'Promote editor -> admin or demote admin -> editor. The owner role cannot be changed.',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['role'],
            properties: {
                role: { type: 'string', enum: ['admin', 'editor'], example: 'admin' },
            },
        },
    }),
    __param(0, (0, common_1.Param)('pageId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('userId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(roleSchema))),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object, Object]),
    __metadata("design:returntype", void 0)
], PagesController.prototype, "changeMemberRole", null);
__decorate([
    (0, common_1.Delete)(':pageId/members/me'),
    (0, swagger_1.ApiOperation)({
        summary: 'Leave a page',
        description: 'Any member except the owner (the owner deletes the page instead).',
    }),
    __param(0, (0, common_1.Param)('pageId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], PagesController.prototype, "leave", null);
__decorate([
    (0, common_1.Delete)(':pageId/members/:userId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Remove a member',
        description: 'The owner removes anyone except themself; an admin removes editors only.',
    }),
    __param(0, (0, common_1.Param)('pageId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('userId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", void 0)
], PagesController.prototype, "removeMember", null);
__decorate([
    (0, common_1.Post)(':pageId/invitations'),
    (0, swagger_1.ApiOperation)({
        summary: 'Invite someone to the page',
        description: [
            'Send `userId` **or** `username` plus the `role` they will get.',
            'The user is notified (push/email per their settings) and **must accept** - only then do they get access.',
            'Only the owner can invite an `admin`; an admin can invite `editor`s. Invitations expire after 7 days.',
        ].join('\n'),
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['role'],
            properties: {
                userId: { type: 'number', example: 2 },
                username: { type: 'string', example: 'alikhan_k3f9a' },
                role: { type: 'string', enum: ['admin', 'editor'], example: 'editor' },
            },
        },
    }),
    __param(0, (0, common_1.Param)('pageId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(inviteSchema))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], PagesController.prototype, "invite", null);
__decorate([
    (0, common_1.Get)(':pageId/invitations'),
    (0, swagger_1.ApiOperation)({
        summary: 'Pending invitations of a page (owner / admin)',
    }),
    __param(0, (0, common_1.Param)('pageId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], PagesController.prototype, "pageInvitations", null);
__decorate([
    (0, common_1.Delete)(':pageId/invitations/:invitationId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Cancel a pending invitation',
        description: 'Owner cancels any; an admin cancels editor invitations only.',
    }),
    __param(0, (0, common_1.Param)('pageId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('invitationId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", void 0)
], PagesController.prototype, "cancelInvitation", null);
__decorate([
    (0, common_1.Post)(':pageId/verification'),
    (0, swagger_1.ApiOperation)({
        summary: 'Ask for the verified tick (upload company documents)',
        description: [
            'Owner/admin uploads 1-5 documents (PDF/JPG/PNG/WEBP, max 10 MB each). Our team reviews them; you are notified of the result and an approved page gets the verified tick (`is_verified`).',
            `\`documentTypes\`: JSON array or comma list in the same order as the files, from: ${page_verification_entity_1.VERIFICATION_DOC_TYPES.join(', ')} (default \`other\`).`,
            'Documents are stored privately - never publicly downloadable. One request at a time; after a rejection you can send again.',
        ].join('\n'),
    }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['documents'],
            properties: {
                documents: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                    maxItems: 5,
                },
                documentTypes: {
                    type: 'string',
                    example: '["business_license","tax_document"]',
                },
                notes: { type: 'string', example: 'Registered in 2015, SECP no. ...' },
            },
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('documents', 5, verificationUpload)),
    __param(0, (0, common_1.Param)('pageId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.UploadedFiles)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Array, Object, Object]),
    __metadata("design:returntype", Promise)
], PagesController.prototype, "submitVerification", null);
__decorate([
    (0, common_1.Get)(':pageId/verification'),
    (0, swagger_1.ApiOperation)({
        summary: 'Verification status of a page (owner / admin)',
        description: '`status`: none / pending / verified / rejected, the latest request (with the rejection reason) and history.',
    }),
    __param(0, (0, common_1.Param)('pageId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], PagesController.prototype, "verificationStatus", null);
exports.PagesController = PagesController = __decorate([
    (0, swagger_1.ApiTags)('Pages'),
    (0, swagger_1.ApiBearerAuth)('JWT'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('pages'),
    __metadata("design:paramtypes", [pages_service_1.PagesService,
        page_invitations_service_1.PageInvitationsService,
        page_verification_service_1.PageVerificationService])
], PagesController);
//# sourceMappingURL=pages.controller.js.map