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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const otp_service_1 = require("../otp/otp.service");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const joi_1 = __importDefault(require("joi"));
const twilio_service_1 = require("../twilio/twilio.service");
let AuthController = class AuthController {
    constructor(authService, otpService, twilioService) {
        this.authService = authService;
        this.otpService = otpService;
        this.twilioService = twilioService;
    }
    async sendOtp(body) {
        const { phone } = body;
        const existingUser = await this.authService.findUserByPhone(phone);
        if (existingUser) {
            throw new common_1.BadRequestException('Phone number is already registered');
        }
        const { salt, hash } = this.authService.hashPassword(body.password);
        body.passwordHash = hash;
        body.passwordSalt = salt;
        delete body.password;
        const otp = this.otpService.generateOTP(phone, body);
        return { message: `OTP sent to ${phone}`, otp };
    }
    async verifyOtp(body) {
        const { phone, code } = body;
        const entry = this.otpService.getOtpEntry(phone);
        if (!entry)
            throw new common_1.UnauthorizedException('OTP not found');
        if (entry.used)
            throw new common_1.UnauthorizedException('OTP already used');
        if (new Date() > entry.expiresAt) {
            this.otpService.deleteOtp(phone);
            throw new common_1.UnauthorizedException('OTP expired');
        }
        if (entry.code !== code)
            throw new common_1.UnauthorizedException('Invalid OTP');
        this.otpService.markUsed(phone);
        const { registrationData } = entry;
        const user = (await this.authService.createOrGetUser({
            ...registrationData,
            isVerified: true,
        })).toObject();
        delete user.passwordHash;
        delete user.passwordSalt;
        const token = this.authService.generateToken(user);
        this.otpService.deleteOtp(phone);
        return { access_token: token, user };
    }
    async login(dto) {
        const { phone, password } = dto;
        const user = (await this.authService.validateUser(phone, password)).toObject();
        delete user.passwordHash;
        delete user.passwordSalt;
        const token = this.authService.generateToken(user);
        return { access_token: token, user };
    }
    async sendForgotPasswordOtp(body) {
        const { phone } = body;
        const user = await this.authService.findUserByPhone(phone);
        if (!user) {
            throw new common_1.BadRequestException('Phone number is not registered');
        }
        const otp = this.otpService.generateOTP(phone, {
            phone,
            purpose: 'forgot-password',
        });
        await this.twilioService.sendSms(phone, `${otp} is your OTP to reset password. It will expire in 5 minutes.`);
        return { message: `OTP sent to ${phone}`, otp };
    }
    async verifyForgotPasswordOtp(body) {
        const { phone, code, newPassword } = body;
        const entry = this.otpService.getOtpEntry(phone);
        if (!entry)
            throw new common_1.UnauthorizedException('OTP not found');
        if (entry.used)
            throw new common_1.UnauthorizedException('OTP already used');
        if (new Date() > entry.expiresAt) {
            this.otpService.deleteOtp(phone);
            throw new common_1.UnauthorizedException('OTP expired');
        }
        if (entry.code !== code)
            throw new common_1.UnauthorizedException('Invalid OTP');
        if (entry.registrationData?.purpose !== 'forgot-password') {
            throw new common_1.UnauthorizedException('OTP is not for password reset');
        }
        const user = await this.authService.findUserByPhone(phone);
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        const { salt, hash } = this.authService.hashPassword(newPassword);
        user.passwordSalt = salt;
        user.passwordHash = hash;
        await user.save();
        this.otpService.markUsed(phone);
        this.otpService.deleteOtp(phone);
        return { message: 'Password has been reset successfully' };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register/send-otp'),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        firstName: joi_1.default.string().required(),
        lastName: joi_1.default.string().required(),
        phone: joi_1.default.string().required(),
        country: joi_1.default.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .required(),
        language: joi_1.default.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .required(),
        password: joi_1.default.string()
            .min(6)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
            .message('Password must include uppercase, lowercase, number, and special character')
            .required(),
        email: joi_1.default.string().email().optional(),
        isVerified: joi_1.default.boolean().optional(),
        isBanned: joi_1.default.boolean().optional(),
        full_name: joi_1.default.string().optional(),
        father_name: joi_1.default.string().optional(),
        gender: joi_1.default.string().valid('Male', 'Female', 'Other').optional(),
        date_of_birth: joi_1.default.date().optional(),
        nationality: joi_1.default.string().optional(),
        marital_status: joi_1.default.string()
            .valid('Single', 'Married', 'Other')
            .optional(),
        profile_photo: joi_1.default.string().uri().optional(),
        alternate_phone: joi_1.default.string().optional(),
        address_line1: joi_1.default.string().optional(),
        address_line2: joi_1.default.string().optional(),
        city: joi_1.default.string().optional(),
        state: joi_1.default.string().optional(),
        postal_code: joi_1.default.string().optional(),
        contact_country: joi_1.default.string().optional(),
        national_id_number: joi_1.default.string().optional(),
        passport_number: joi_1.default.string().optional(),
        id_expiry_date: joi_1.default.date().optional(),
        id_document_front: joi_1.default.string().uri().optional(),
        id_document_back: joi_1.default.string().uri().optional(),
        address_proof_document: joi_1.default.string().uri().optional(),
        professional_summary: joi_1.default.string().optional(),
        work_experience: joi_1.default.array()
            .items(joi_1.default.object({
            company_name: joi_1.default.string().optional(),
            designation: joi_1.default.string().optional(),
            department: joi_1.default.string().optional(),
            employment_type: joi_1.default.string()
                .valid('Full-time', 'Part-time', 'Contract')
                .optional(),
            from_date: joi_1.default.date().optional(),
            to_date: joi_1.default.date().optional(),
            key_responsibilities: joi_1.default.string().optional(),
            experience_certificate: joi_1.default.string().uri().optional(),
            currently_working: joi_1.default.boolean().optional(),
        }))
            .optional(),
        education: joi_1.default.array()
            .items(joi_1.default.object({
            highest_qualification: joi_1.default.string().optional(),
            institution_name: joi_1.default.string().optional(),
            graduation_year: joi_1.default.string().optional(),
            gpa_or_grade: joi_1.default.string().optional(),
            degree_document: joi_1.default.string().uri().optional(),
        }))
            .optional(),
        certifications: joi_1.default.array()
            .items(joi_1.default.object({
            certification_name: joi_1.default.string().optional(),
            issuing_institution: joi_1.default.string().optional(),
            certification_date: joi_1.default.date().optional(),
            certificate_file: joi_1.default.string().uri().optional(),
        }))
            .optional(),
        skills: joi_1.default.array().items(joi_1.default.string()).optional(),
        technical_skills: joi_1.default.array().items(joi_1.default.string()).optional(),
        soft_skills: joi_1.default.array().items(joi_1.default.string()).optional(),
        linkedin_url: joi_1.default.string().uri().optional(),
        github_url: joi_1.default.string().uri().optional(),
        portfolio_url: joi_1.default.string().uri().optional(),
        behance_url: joi_1.default.string().uri().optional(),
        bank_name: joi_1.default.string().optional(),
        account_number: joi_1.default.string().optional(),
        iban: joi_1.default.string().optional(),
        branch_name: joi_1.default.string().optional(),
        swift_code: joi_1.default.string().optional(),
        kyc_status: joi_1.default.string()
            .valid('pending', 'verified', 'rejected')
            .default('pending'),
        verified_by_admin_id: joi_1.default.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .optional(),
        verification_date: joi_1.default.date().optional(),
        rejection_reason: joi_1.default.string().optional(),
        notes: joi_1.default.string().optional(),
    }))),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendOtp", null);
__decorate([
    (0, common_1.Post)('register/verify-otp'),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        phone: joi_1.default.string().required(),
        code: joi_1.default.string().length(6).required(),
    }))),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyOtp", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        phone: joi_1.default.string().required(),
        password: joi_1.default.string()
            .min(6)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
            .message('Password must include uppercase, lowercase, number, and special character')
            .required(),
    }))),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('forgot-password/send-otp'),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        phone: joi_1.default.string().required(),
    }))),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendForgotPasswordOtp", null);
__decorate([
    (0, common_1.Post)('forgot-password/verify-otp'),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        phone: joi_1.default.string().required(),
        code: joi_1.default.string().length(6).required(),
        newPassword: joi_1.default.string()
            .min(6)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
            .message('Password must include uppercase, lowercase, number, and special character')
            .required(),
    }))),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyForgotPasswordOtp", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        otp_service_1.OtpService,
        twilio_service_1.TwilioService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map