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
let UsersController = class UsersController {
    constructor(usersService, authService) {
        this.usersService = usersService;
        this.authService = authService;
    }
    async updateMe(req, body) {
        const userId = req.user?.id;
        if (!userId)
            throw new common_1.NotFoundException('User not found or unauthorized');
        const forbidden = [
            'passwordHash',
            'passwordSalt',
            'isBanned',
            'isVerified',
            'verified_by_admin_id',
            'kyc_status',
            'country',
        ];
        forbidden.forEach((field) => delete body[field]);
        if (body?.password) {
            const { salt, hash } = this.authService.hashPassword(body.password);
            body.passwordHash = hash;
            body.passwordSalt = salt;
        }
        const updatedUser = await this.usersService.updateUser(userId, body);
        return {
            message: 'Profile updated successfully',
            user: updatedUser,
        };
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Patch)('me'),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(Joi.object({
        email: Joi.string().email().optional(),
        firstName: Joi.string().optional(),
        lastName: Joi.string().optional(),
        phone: Joi.string().optional(),
        password: Joi.string()
            .min(6)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
            .message('Password must include uppercase, lowercase, number, and special character')
            .optional(),
        full_name: Joi.string().optional(),
        father_name: Joi.string().optional(),
        gender: Joi.string().valid('Male', 'Female', 'Other').optional(),
        date_of_birth: Joi.date().optional(),
        nationality: Joi.string().optional(),
        marital_status: Joi.string()
            .valid('Single', 'Married', 'Other')
            .optional(),
        profile_photo: Joi.string().uri().optional(),
        alternate_phone: Joi.string().optional(),
        address_line1: Joi.string().optional(),
        address_line2: Joi.string().optional(),
        city: Joi.string().optional(),
        state: Joi.string().optional(),
        postal_code: Joi.string().optional(),
        contact_country: Joi.string().optional(),
        professional_summary: Joi.string().optional(),
        work_experience: Joi.array()
            .items(Joi.object({
            company_name: Joi.string().optional(),
            designation: Joi.string().optional(),
            department: Joi.string().optional(),
            employment_type: Joi.string()
                .valid('Full-time', 'Part-time', 'Contract')
                .optional(),
            from_date: Joi.date().optional(),
            to_date: Joi.date().optional(),
            key_responsibilities: Joi.string().optional(),
            experience_certificate: Joi.string().uri().optional(),
            currently_working: Joi.boolean().optional(),
        }))
            .optional(),
        education: Joi.array()
            .items(Joi.object({
            highest_qualification: Joi.string().optional(),
            institution_name: Joi.string().optional(),
            graduation_year: Joi.string().optional(),
            gpa_or_grade: Joi.string().optional(),
            degree_document: Joi.string().uri().optional(),
        }))
            .optional(),
        certifications: Joi.array()
            .items(Joi.object({
            certification_name: Joi.string().optional(),
            issuing_institution: Joi.string().optional(),
            certification_date: Joi.date().optional(),
            certificate_file: Joi.string().uri().optional(),
        }))
            .optional(),
        skills: Joi.array().items(Joi.string()).optional(),
        technical_skills: Joi.array().items(Joi.string()).optional(),
        soft_skills: Joi.array().items(Joi.string()).optional(),
        linkedin_url: Joi.string().uri().optional(),
        github_url: Joi.string().uri().optional(),
        portfolio_url: Joi.string().uri().optional(),
        behance_url: Joi.string().uri().optional(),
        bank_name: Joi.string().optional(),
        account_number: Joi.string().optional(),
        iban: Joi.string().optional(),
        branch_name: Joi.string().optional(),
        swift_code: Joi.string().optional(),
        notes: Joi.string().optional(),
        filter_preferences: Joi.array()
            .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
            .optional(),
    }))),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateMe", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        auth_service_1.AuthService])
], UsersController);
//# sourceMappingURL=users.controller.js.map