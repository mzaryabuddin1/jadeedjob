"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const Joi = __importStar(require("joi"));
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const platform_express_1 = require("@nestjs/platform-express");
const optionalString = () => Joi.string().allow('', null).optional();
const optionalUri = () => Joi.string().uri().allow('', null).optional();
const optionalDate = () => Joi.alternatives()
    .try(Joi.date(), Joi.string().allow('', null))
    .optional();
const optionalRelationId = () => Joi.alternatives()
    .try(Joi.number().integer().positive(), Joi.string().pattern(/^\d+$/), Joi.string().allow('', null))
    .optional();
const workExperienceSchema = Joi.object({
    id: Joi.number().integer().positive().optional(),
    company_name: optionalString(),
    designation: optionalString(),
    department: optionalString(),
    employment_type: optionalString(),
    from_date: optionalDate(),
    to_date: optionalDate(),
    key_responsibilities: optionalString(),
    experience_certificate: optionalString(),
    currently_working: Joi.boolean().optional(),
});
const educationSchema = Joi.object({
    id: Joi.number().integer().positive().optional(),
    highest_qualification: optionalString(),
    institution_name: optionalString(),
    graduation_year: optionalString(),
    gpa_or_grade: optionalString(),
    degree_document: optionalString(),
});
const certificationSchema = Joi.object({
    id: Joi.number().integer().positive().optional(),
    certification_name: optionalString(),
    issuing_institution: optionalString(),
    certification_date: optionalDate(),
    certificate_file: optionalString(),
});
const spokenLanguageSchema = Joi.object({
    language: optionalString(),
    level: optionalString(),
});
const documentUploadOptions = {
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, callback) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowed.includes(file.mimetype)) {
            callback(new common_1.BadRequestException('Unsupported document file type'), false);
            return;
        }
        callback(null, true);
    },
};
let UsersController = class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }
    async getMe(req) {
        const userId = req.user?.id;
        if (!userId)
            throw new common_1.NotFoundException('User not found or unauthorized');
        return this.usersService.getMyProfileResponse(userId);
    }
    async updateMe(req, body) {
        const userId = req.user?.id;
        if (!userId)
            throw new common_1.NotFoundException('User not found or unauthorized');
        let newFilterPreferences;
        if (Array.isArray(body.filter_preferences)) {
            newFilterPreferences = body.filter_preferences;
            delete body.filter_preferences;
        }
        const forbidden = [
            'passwordHash',
            'passwordSalt',
            'password',
            'phone',
            'isBanned',
            'isVerified',
            'verified_by_admin_id',
            'kyc_status',
            'verification_date',
            'rejection_reason',
            'referralCode',
            'tokenVersion',
            'phoneVerifiedAt',
            'admin_notes',
            'systemRole',
        ];
        forbidden.forEach((field) => delete body[field]);
        await this.usersService.updateMyProfile(userId, body);
        if (newFilterPreferences !== undefined) {
            await this.usersService.updateUserFilterPreferences(userId, newFilterPreferences);
        }
        const profile = await this.usersService.getMyProfileResponse(userId);
        return {
            message: 'Profile updated successfully',
            ...profile,
        };
    }
    async uploadMyDocument(req, file, body) {
        const userId = req.user?.id;
        if (!userId)
            throw new common_1.NotFoundException('User not found or unauthorized');
        if (!file)
            throw new common_1.BadRequestException('No file provided');
        const result = await this.usersService.uploadProfileDocument(userId, body.type, file);
        return {
            message: 'Document uploaded successfully',
            fileName: file.originalname,
            fileUrl: result.fileUrl,
            ...result.profile,
        };
    }
    async getMyPreferences(req) {
        return await this.usersService.getUserPreference(req.user.id);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getMe", null);
__decorate([
    (0, common_1.Patch)('me'),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(Joi.object({
        email: Joi.string().email().allow('', null).optional(),
        firstName: optionalString(),
        lastName: optionalString(),
        country: optionalRelationId(),
        countryId: optionalRelationId(),
        language: optionalRelationId(),
        languageId: optionalRelationId(),
        filter_preferences: Joi.array()
            .items(Joi.number().integer().positive())
            .optional(),
        full_name: optionalString(),
        father_name: optionalString(),
        gender: Joi.string()
            .valid('Male', 'Female', 'Other', '')
            .allow(null)
            .optional(),
        date_of_birth: optionalDate(),
        nationality: optionalString(),
        marital_status: Joi.string()
            .valid('Single', 'Married', 'Other', '')
            .allow(null)
            .optional(),
        profile_photo: Joi.forbidden(),
        alternate_phone: optionalString(),
        address_line1: optionalString(),
        address_line2: optionalString(),
        city: optionalString(),
        state: optionalString(),
        postal_code: optionalString(),
        contact_country: optionalString(),
        national_id_number: optionalString(),
        passport_number: optionalString(),
        id_expiry_date: optionalDate(),
        id_document_front: Joi.forbidden(),
        id_document_back: Joi.forbidden(),
        address_proof_document: Joi.forbidden(),
        professional_summary: optionalString(),
        skills: Joi.array().max(50).items(Joi.string().max(80)).optional(),
        technical_skills: Joi.array().max(50).items(Joi.string().max(80)).optional(),
        soft_skills: Joi.array().max(50).items(Joi.string().max(80)).optional(),
        languages_spoken: Joi.array().max(20).items(spokenLanguageSchema).optional(),
        work_experience: Joi.array().max(25).items(workExperienceSchema).optional(),
        education: Joi.array().max(25).items(educationSchema).optional(),
        certifications: Joi.array().max(25).items(certificationSchema).optional(),
        linkedin_url: optionalUri(),
        github_url: optionalUri(),
        portfolio_url: optionalUri(),
        behance_url: optionalUri(),
        bank_name: optionalString(),
        account_number: optionalString(),
        iban: optionalString(),
        branch_name: optionalString(),
        swift_code: optionalString(),
        notes: optionalString(),
    }))),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateMe", null);
__decorate([
    (0, common_1.Post)('me/documents'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', documentUploadOptions)),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(Joi.object({
        type: Joi.string()
            .valid('id_front', 'id_back', 'address_proof', 'profile_photo')
            .required(),
    })))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "uploadMyDocument", null);
__decorate([
    (0, common_1.Get)('me/preferences'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getMyPreferences", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map