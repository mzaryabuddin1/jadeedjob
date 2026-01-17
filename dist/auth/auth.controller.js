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
        const { salt, hash } = this.authService.hashPassword(body.password);
        body.passwordHash = hash;
        body.passwordSalt = salt;
        delete body.password;
        const otp = this.otpService.generateOTP(body.phone, body);
        return { message: `OTP sent to ${body.phone}`, otp };
    }
    async verifyOtp(body) {
        const { phone, code, fcmToken = null } = body;
        const entry = this.otpService.getOtpEntry(phone);
        if (!entry)
            throw new common_1.UnauthorizedException('OTP not found');
        if (entry.used)
            throw new common_1.UnauthorizedException('OTP already used');
        if (entry.code !== code)
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
            await this.usersService.updateUser(user.id, {
                fcmToken,
            });
        }
        const token = this.authService.generateToken(user);
        this.otpService.deleteOtp(phone);
        return { access_token: token, user };
    }
    async login(dto) {
        const user = await this.authService.validateUser(dto.phone, dto.password);
        const { passwordHash, passwordSalt, ...publicUser } = user;
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
        lastName: joi_1.default.string().required(),
        phone: joi_1.default.string().required(),
        country: joi_1.default.number().required(),
        language: joi_1.default.number().required(),
        password: joi_1.default.string()
            .min(6)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
            .required(),
        email: joi_1.default.string().email().optional(),
        full_name: joi_1.default.string().optional(),
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