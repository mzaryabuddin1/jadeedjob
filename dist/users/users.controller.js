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
const auth_service_1 = require("../auth/auth.service");
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
let UsersController = class UsersController {
    constructor(usersService, authService) {
        this.usersService = usersService;
        this.authService = authService;
    }
    async getMe(req) {
        const userId = req.user?.id;
        if (!userId)
            throw new common_1.NotFoundException('User not found or unauthorized');
        const user = await this.usersService.getPublicUserById(userId);
        return { user };
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
            'isBanned',
            'isVerified',
            'verified_by_admin_id',
            'kyc_status',
            'verification_date',
            'rejection_reason',
        ];
        forbidden.forEach((field) => delete body[field]);
        if (body?.password) {
            const { salt, hash } = this.authService.hashPassword(body.password);
            body.passwordHash = hash;
            body.passwordSalt = salt;
            delete body.password;
        }
        let updatedUser = await this.usersService.updateMyProfile(userId, body);
        if (newFilterPreferences !== undefined) {
            const normalizedFilterPreferences = await this.usersService.updateUserFilterPreferences(userId, newFilterPreferences);
            updatedUser.filter_preferences = normalizedFilterPreferences;
            updatedUser = await this.usersService.getPublicUserById(userId);
        }
        return {
            message: 'Profile updated successfully',
            user: updatedUser,
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
        phone: optionalString(),
        country: optionalRelationId(),
        language: optionalRelationId(),
        password: Joi.string()
            .min(6)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
            .message('Password must include uppercase, lowercase, number, and special character')
            .optional(),
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
        profile_photo: optionalUri(),
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
        id_document_front: optionalUri(),
        id_document_back: optionalUri(),
        address_proof_document: optionalUri(),
        professional_summary: optionalString(),
        skills: Joi.array().items(Joi.string()).optional(),
        technical_skills: Joi.array().items(Joi.string()).optional(),
        soft_skills: Joi.array().items(Joi.string()).optional(),
        languages_spoken: Joi.array().items(spokenLanguageSchema).optional(),
        work_experience: Joi.array().items(workExperienceSchema).optional(),
        education: Joi.array().items(educationSchema).optional(),
        certifications: Joi.array().items(certificationSchema).optional(),
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
    (0, common_1.Get)('me/preferences'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getMyPreferences", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        auth_service_1.AuthService])
], UsersController);
//# sourceMappingURL=users.controller.js.map