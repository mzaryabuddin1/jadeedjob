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
const users_service_1 = require("../users/users.service");
const relationIdSchema = joi_1.default.alternatives().try(joi_1.default.number().integer().positive(), joi_1.default.string().pattern(/^\d+$/));
const optionalString = () => joi_1.default.string().allow('', null).optional();
const getRelationId = (value) => {
    if (value === undefined || value === null || value === '')
        return undefined;
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0)
        return undefined;
    return id;
};
const isRelationIdLike = (value) => getRelationId(value) !== undefined;
let AuthController = class AuthController {
    constructor(authService, otpService, twilioService, usersService) {
        this.authService = authService;
        this.otpService = otpService;
        this.twilioService = twilioService;
        this.usersService = usersService;
    }
    async sendOtp(body) {
        const existing = await this.authService.findUserByPhone(body.phone);
        if (existing)
            throw new common_1.BadRequestException('Phone already registered');
        const countryId = getRelationId(body.countryId ?? body.country);
        const languageId = getRelationId(body.languageId ?? body.language);
        if (!countryId) {
            throw new common_1.BadRequestException('countryId must be a valid ID');
        }
        if (!languageId) {
            throw new common_1.BadRequestException('languageId must be a valid ID');
        }
        await this.authService.validateRegistrationRelations(countryId, languageId);
        const countryDisplay = typeof body.country === 'string' && !isRelationIdLike(body.country)
            ? body.country
            : undefined;
        const { salt, hash } = this.authService.hashPassword(body.password);
        const registrationData = {
            ...body,
            lastName: body.lastName || '',
            country: countryId,
            language: languageId,
            profile_photo: body.photoUri || undefined,
            contact_country: countryDisplay,
            passwordHash: hash,
            passwordSalt: salt,
        };
        delete registrationData.countryId;
        delete registrationData.languageId;
        delete registrationData.photoUri;
        delete registrationData.password;
        const otp = this.otpService.generateOTP(body.phone, registrationData);
        return { message: `OTP sent to ${body.phone}`, otp };
    }
    async verifyOtp(body) {
        const { phone, otp, code, fcmToken = null } = body;
        const submittedOtp = otp ?? code;
        const entry = this.otpService.getOtpEntry(phone);
        if (!entry)
            throw new common_1.UnauthorizedException('OTP not found');
        if (entry.used)
            throw new common_1.UnauthorizedException('OTP already used');
        if (entry.code !== submittedOtp)
            throw new common_1.UnauthorizedException('Invalid OTP');
        if (new Date() > entry.expiresAt) {
            this.otpService.deleteOtp(phone);
            throw new common_1.UnauthorizedException('OTP expired');
        }
        this.otpService.markUsed(phone);
        const user = (await this.authService.createOrGetUser({
            ...entry.registrationData,
            isVerified: true,
        }));
        if (fcmToken) {
            await this.authService.attachFcmToken(user.id, fcmToken);
        }
        const token = this.authService.generateToken(user);
        this.otpService.deleteOtp(phone);
        return {
            access_token: token,
            user: this.authService.toPublicUser(user),
        };
    }
    async login(dto) {
        const user = await this.authService.validateUser(dto.phone, dto.password);
        const publicUser = this.authService.toPublicUser(user);
        if (dto.fcmToken) {
            await this.authService.attachFcmToken(user.id, dto.fcmToken);
        }
        const token = this.authService.generateToken(user);
        return {
            access_token: token,
            user: publicUser,
        };
    }
    async sendForgotPasswordOtp(body) {
        const user = await this.authService.findUserByPhone(body.phone);
        if (!user)
            throw new common_1.BadRequestException('Phone not registered');
        const otp = this.otpService.generateOTP(body.phone, {
            phone: body.phone,
            purpose: 'forgot-password',
        });
        return { message: `OTP sent to ${body.phone}`, otp };
    }
    async verifyForgotPasswordOtp(body) {
        const { phone, code, newPassword } = body;
        const entry = this.otpService.getOtpEntry(phone);
        if (!entry)
            throw new common_1.UnauthorizedException('OTP not found');
        if (entry.code !== code)
            throw new common_1.UnauthorizedException('Invalid OTP');
        if (entry.registrationData?.purpose !== 'forgot-password')
            throw new common_1.UnauthorizedException('Invalid OTP purpose');
        if (new Date() > entry.expiresAt)
            throw new common_1.UnauthorizedException('OTP expired');
        const user = await this.authService.findUserByPhone(phone);
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        const { salt, hash } = this.authService.hashPassword(newPassword);
        await this.authService.resetPassword(phone, salt, hash);
        this.otpService.markUsed(phone);
        this.otpService.deleteOtp(phone);
        return { message: 'Password reset successfully' };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register/send-otp'),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        firstName: joi_1.default.string().required(),
        lastName: optionalString(),
        phone: joi_1.default.string().required(),
        countryId: relationIdSchema.optional(),
        languageId: relationIdSchema.optional(),
        country: joi_1.default.alternatives()
            .try(relationIdSchema, joi_1.default.string().allow('', null))
            .optional(),
        language: relationIdSchema.optional(),
        password: joi_1.default.string()
            .min(6)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
            .required(),
        email: joi_1.default.string().email().optional(),
        full_name: joi_1.default.string().optional(),
        photoUri: optionalString(),
        city: optionalString(),
        latitude: joi_1.default.number().min(-90).max(90).optional(),
        longitude: joi_1.default.number().min(-180).max(180).optional(),
    }))),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendOtp", null);
__decorate([
    (0, common_1.Post)('register/verify-otp'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyOtp", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        phone: joi_1.default.string().required(),
        password: joi_1.default.string().required(),
        fcmToken: joi_1.default.string().optional(),
    }))),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('forgot-password/send-otp'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendForgotPasswordOtp", null);
__decorate([
    (0, common_1.Post)('forgot-password/verify-otp'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyForgotPasswordOtp", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        otp_service_1.OtpService,
        twilio_service_1.TwilioService,
        users_service_1.UsersService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map