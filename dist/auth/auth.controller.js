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
const jwt_auth_guard_1 = require("./jwt-auth.guard");
const auth_session_service_1 = require("./auth-session.service");
const social_auth_service_1 = require("./social-auth.service");
const throttler_1 = require("@nestjs/throttler");
const legal_service_1 = require("../legal/legal.service");
const swagger_1 = require("@nestjs/swagger");
const register_send_otp_dto_1 = require("./dto/register-send-otp.dto");
const legal_decorators_1 = require("../legal/legal.decorators");
const relationIdSchema = joi_1.default.alternatives().try(joi_1.default.number().integer().positive(), joi_1.default.string().pattern(/^\d+$/));
const optionalString = () => joi_1.default.string().allow('', null).optional();
const passwordSchema = joi_1.default.string()
    .min(6)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
    .message('Password must include uppercase, lowercase, number, and special character');
const getRelationId = (value) => {
    if (value === undefined || value === null || value === '')
        return undefined;
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0)
        return undefined;
    return id;
};
const isRelationIdLike = (value) => getRelationId(value) !== undefined;
const sessionDeviceFields = {
    installationId: joi_1.default.string().trim().max(120).optional(),
    platform: joi_1.default.string().valid('ios', 'android', 'web', 'unknown').optional(),
    deviceName: joi_1.default.string().trim().max(120).allow('', null).optional(),
    appVersion: joi_1.default.string().trim().max(40).allow('', null).optional(),
    locale: joi_1.default.string().trim().max(20).allow('', null).optional(),
};
const legalAcceptanceFields = {
    legalAcceptances: joi_1.default.array()
        .items(joi_1.default.object({
        documentType: joi_1.default.string()
            .valid('terms', 'privacy', 'community_guidelines')
            .required(),
        version: joi_1.default.string().trim().min(1).max(80).required(),
    }))
        .max(3)
        .optional(),
    clientPlatform: joi_1.default.string()
        .valid('ios', 'android', 'web', 'unknown')
        .optional(),
};
let AuthController = class AuthController {
    constructor(authService, otpService, twilioService, usersService, authSessionService, socialAuthService, legalService) {
        this.authService = authService;
        this.otpService = otpService;
        this.twilioService = twilioService;
        this.usersService = usersService;
        this.authSessionService = authSessionService;
        this.socialAuthService = socialAuthService;
        this.legalService = legalService;
    }
    deviceFrom(body) {
        return {
            installationId: body.installationId,
            platform: body.platform,
            deviceName: body.deviceName,
            appVersion: body.appVersion,
        };
    }
    async sessionResponse(user, session, message) {
        const { userId: _userId, ...tokens } = session;
        const profileResponse = await this.usersService.getMyProfileResponse(user.id);
        return {
            ...(message ? { message } : {}),
            ...tokens,
            profile: profileResponse.user,
            ...profileResponse,
        };
    }
    async deliverOtp(phone, code, purpose) {
        if (!process.env.TWILIO_ACCOUNT_SID ||
            !process.env.TWILIO_AUTH_TOKEN ||
            !process.env.TWILIO_PHONE_NUMBER) {
            return;
        }
        try {
            await this.twilioService.sendSms(phone, `Your JobsLoot ${purpose} OTP is ${code}. It expires in 5 minutes.`);
        }
        catch (error) {
            if (process.env.NODE_ENV === 'production') {
                throw error;
            }
            console.warn('Skipping OTP SMS delivery in development', {
                purpose,
                errorCode: error?.code ||
                    error?.name ||
                    'SMS_DELIVERY_FAILED',
            });
        }
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
        await this.legalService.validateRegistrationAcceptances(body.legalAcceptances);
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
        delete registrationData.legalAcceptances;
        delete registrationData.clientPlatform;
        const { otp } = await this.otpService.createOtp({
            purpose: 'register',
            target: body.phone,
            metadata: {
                registrationData,
                legalAcceptances: body.legalAcceptances || [],
                legalClientPlatform: body.clientPlatform || 'unknown',
            },
        });
        await this.deliverOtp(body.phone, otp, 'registration');
        return this.otpService.otpResponse(`OTP sent to ${body.phone}`, otp);
    }
    async verifyOtp(body) {
        const { phone, otp, code, fcmToken = null } = body;
        const submittedOtp = otp ?? code;
        const entry = await this.otpService.verifyOtp({
            purpose: 'register',
            target: phone,
            otp: submittedOtp,
        });
        const user = (await this.authService.createOrGetUser({
            ...entry.metadata?.registrationData,
            phoneVerifiedAt: new Date(),
            isVerified: false,
        }));
        await this.legalService.recordRegistrationAcceptances(user.id, entry.metadata?.legalAcceptances, entry.metadata?.legalClientPlatform || 'unknown');
        if (fcmToken) {
            await this.authService.attachFcmToken(user.id, fcmToken, {
                installationId: body.installationId,
                platform: body.platform,
                appVersion: body.appVersion,
                locale: body.locale,
            });
        }
        const session = await this.authSessionService.createSession(user, this.deviceFrom(body));
        return this.sessionResponse(user, session);
    }
    async login(dto) {
        const user = await this.authService.validateUser(dto.phone, dto.password);
        if (dto.fcmToken) {
            await this.authService.attachFcmToken(user.id, dto.fcmToken, {
                installationId: dto.installationId,
                platform: dto.platform,
                appVersion: dto.appVersion,
                locale: dto.locale,
            });
        }
        const session = await this.authSessionService.createSession(user, this.deviceFrom(dto));
        return this.sessionResponse(user, session);
    }
    async sendForgotPasswordOtp(body) {
        const user = await this.authService.findUserByPhone(body.phone);
        if (!user)
            throw new common_1.BadRequestException('Phone not registered');
        const { otp } = await this.otpService.createOtp({
            purpose: 'forgot-password',
            target: body.phone,
            metadata: {
                phone: body.phone,
            },
        });
        await this.deliverOtp(body.phone, otp, 'forgot password');
        return this.otpService.otpResponse(`OTP sent to ${body.phone}`, otp);
    }
    async verifyForgotPasswordOtp(body) {
        const { phone, code, otp, newPassword } = body;
        const submittedOtp = otp ?? code;
        await this.otpService.verifyOtp({
            purpose: 'forgot-password',
            target: phone,
            otp: submittedOtp,
        });
        const user = await this.authService.findUserByPhone(phone);
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        const { salt, hash } = this.authService.hashPassword(newPassword);
        const updated = await this.authService.resetPassword(phone, salt, hash);
        await this.authSessionService.revokeAllForUser(updated.id, 'password_reset');
        return { message: 'Password reset successfully' };
    }
    async sendPhoneChangeOtp(req, body) {
        const userId = req.user?.id;
        const user = await this.authService.validateUserByIdAndPassword(userId, body.currentPassword);
        if (user.phone === body.newPhone) {
            throw new common_1.BadRequestException('New phone must be different');
        }
        const existing = await this.authService.findUserByPhone(body.newPhone);
        if (existing)
            throw new common_1.BadRequestException('Phone already registered');
        const { otp } = await this.otpService.createOtp({
            purpose: 'phone-change',
            target: body.newPhone,
            userId,
            metadata: {
                newPhone: body.newPhone,
            },
        });
        await this.deliverOtp(body.newPhone, otp, 'phone change');
        return this.otpService.otpResponse(`OTP sent to ${body.newPhone}`, otp);
    }
    async verifyPhoneChangeOtp(req, body) {
        const userId = req.user?.id;
        await this.authService.validateUserByIdAndPassword(userId, body.currentPassword);
        await this.otpService.verifyOtp({
            purpose: 'phone-change',
            target: body.newPhone,
            userId,
            otp: body.otp,
        });
        const user = await this.authService.changePhone(userId, body.newPhone);
        const profile = await this.usersService.getMyProfileResponse(user.id);
        return {
            message: 'Phone updated successfully',
            ...profile,
        };
    }
    async sendPasswordChangeOtp(req, body) {
        const userId = req.user?.id;
        const user = await this.authService.validateUserByIdAndPassword(userId, body.currentPassword);
        if (!user.phoneVerifiedAt) {
            throw new common_1.BadRequestException('Phone must be verified first');
        }
        const { otp } = await this.otpService.createOtp({
            purpose: 'password-change',
            target: user.phone,
            userId,
        });
        await this.deliverOtp(user.phone, otp, 'password change');
        return this.otpService.otpResponse(`OTP sent to ${user.phone}`, otp);
    }
    async verifyPasswordChangeOtp(req, body) {
        const userId = req.user?.id;
        const user = await this.authService.validateUserByIdAndPassword(userId, body.currentPassword);
        await this.otpService.verifyOtp({
            purpose: 'password-change',
            target: user.phone,
            userId,
            otp: body.otp,
        });
        const updatedUser = await this.authService.changePassword(userId, body.newPassword);
        await this.authSessionService.revokeAllForUser(updatedUser.id, 'password_changed');
        const session = await this.authSessionService.createSession(updatedUser, this.deviceFrom(body));
        return this.sessionResponse(updatedUser, session, 'Password changed successfully');
    }
    async refresh(body) {
        const session = await this.authSessionService.refresh(body.refreshToken);
        const user = await this.authService.findUserById(session.userId);
        return this.sessionResponse(user, session);
    }
    async logout(req) {
        await this.authSessionService.revokeSession(req.user?.sid, 'logout');
        return { message: 'Logged out successfully' };
    }
    async logoutAll(req) {
        const userId = req.user?.id;
        await this.authService.incrementTokenVersion(userId);
        await this.authSessionService.revokeAllForUser(userId, 'logout_all');
        return { message: 'Logged out from all devices successfully' };
    }
    async google(body, response) {
        const providerProfile = await this.socialAuthService.verifyGoogle(body.idToken);
        return this.finishSocialLogin(providerProfile, body, response);
    }
    async facebook(body, response) {
        const providerProfile = await this.socialAuthService.verifyFacebook(body.accessToken);
        return this.finishSocialLogin(providerProfile, body, response);
    }
    async sendSocialPhoneOtp(body) {
        const challenge = await this.socialAuthService.verifyPhoneChallenge(body.socialVerificationToken);
        const { otp } = await this.otpService.createOtp({
            purpose: 'social-phone',
            target: body.phone,
            metadata: {
                challengeJti: challenge.jti,
            },
        });
        await this.deliverOtp(body.phone, otp, 'social sign-in');
        return this.otpService.otpResponse(`OTP sent to ${body.phone}`, otp);
    }
    async verifySocialPhoneOtp(body) {
        const challenge = await this.socialAuthService.verifyPhoneChallenge(body.socialVerificationToken);
        const otpRecord = await this.otpService.verifyOtp({
            purpose: 'social-phone',
            target: body.phone,
            otp: body.otp,
        });
        if (otpRecord.metadata?.challengeJti !== challenge.jti) {
            throw new common_1.UnauthorizedException('OTP does not match this social login');
        }
        const consumedChallenge = await this.socialAuthService.consumePhoneChallenge(body.socialVerificationToken);
        const user = await this.socialAuthService.linkVerifiedPhone(consumedChallenge, body.phone);
        if (body.fcmToken) {
            await this.authService.attachFcmToken(user.id, body.fcmToken, {
                installationId: body.installationId,
                platform: body.platform,
                appVersion: body.appVersion,
                locale: body.locale,
            });
        }
        const session = await this.authSessionService.createSession(user, this.deviceFrom(body));
        return this.sessionResponse(user, session);
    }
    async finishSocialLogin(providerProfile, body, response) {
        const user = await this.socialAuthService.findLinkedUser(providerProfile);
        if (!user) {
            response.status(202);
            return await this.socialAuthService.createPhoneChallenge(providerProfile);
        }
        if (body.fcmToken) {
            await this.authService.attachFcmToken(user.id, body.fcmToken, {
                installationId: body.installationId,
                platform: body.platform,
                appVersion: body.appVersion,
                locale: body.locale,
            });
        }
        const session = await this.authSessionService.createSession(user, this.deviceFrom(body));
        return this.sessionResponse(user, session);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register/send-otp'),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 300_000 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Start phone registration with optional current legal acceptances' }),
    (0, swagger_1.ApiBody)({ type: register_send_otp_dto_1.RegisterSendOtpDto }),
    (0, legal_decorators_1.ApiRegistrationAcceptanceRequired)(),
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
        password: passwordSchema.required(),
        email: joi_1.default.string().email().optional(),
        full_name: joi_1.default.string().optional(),
        photoUri: optionalString(),
        city: optionalString(),
        latitude: joi_1.default.number().min(-90).max(90).optional(),
        longitude: joi_1.default.number().min(-180).max(180).optional(),
        ...legalAcceptanceFields,
    }))),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendOtp", null);
__decorate([
    (0, common_1.Post)('register/verify-otp'),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 300_000 } }),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        phone: joi_1.default.string().required(),
        otp: joi_1.default.string().optional(),
        code: joi_1.default.string().optional(),
        fcmToken: joi_1.default.string().optional(),
        ...sessionDeviceFields,
    }).or('otp', 'code'))),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyOtp", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60_000 } }),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        phone: joi_1.default.string().required(),
        password: joi_1.default.string().required(),
        fcmToken: joi_1.default.string().optional(),
        ...sessionDeviceFields,
    }))),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('forgot-password/send-otp'),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 300_000 } }),
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
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 300_000 } }),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        phone: joi_1.default.string().required(),
        code: joi_1.default.string().optional(),
        otp: joi_1.default.string().optional(),
        newPassword: passwordSchema.required(),
    }).or('code', 'otp'))),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyForgotPasswordOtp", null);
__decorate([
    (0, common_1.Post)('phone-change/send-otp'),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 300_000 } }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        currentPassword: joi_1.default.string().required(),
        newPhone: joi_1.default.string().required(),
    }))),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendPhoneChangeOtp", null);
__decorate([
    (0, common_1.Post)('phone-change/verify-otp'),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 300_000 } }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        currentPassword: joi_1.default.string().required(),
        newPhone: joi_1.default.string().required(),
        otp: joi_1.default.string().required(),
        ...sessionDeviceFields,
    }))),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyPhoneChangeOtp", null);
__decorate([
    (0, common_1.Post)('password-change/send-otp'),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 300_000 } }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        currentPassword: joi_1.default.string().required(),
    }))),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendPasswordChangeOtp", null);
__decorate([
    (0, common_1.Post)('password-change/verify-otp'),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 300_000 } }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        currentPassword: joi_1.default.string().required(),
        newPassword: passwordSchema.required(),
        otp: joi_1.default.string().required(),
        ...sessionDeviceFields,
    }))),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyPasswordChangeOtp", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        refreshToken: joi_1.default.string().required(),
    }))),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('logout-all'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logoutAll", null);
__decorate([
    (0, common_1.Post)('google'),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60_000 } }),
    __param(0, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        idToken: joi_1.default.string().required(),
        fcmToken: joi_1.default.string().optional(),
        ...sessionDeviceFields,
    })))),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "google", null);
__decorate([
    (0, common_1.Post)('facebook'),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60_000 } }),
    __param(0, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        accessToken: joi_1.default.string().required(),
        fcmToken: joi_1.default.string().optional(),
        ...sessionDeviceFields,
    })))),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "facebook", null);
__decorate([
    (0, common_1.Post)('social/phone/send-otp'),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 300_000 } }),
    __param(0, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        socialVerificationToken: joi_1.default.string().required(),
        phone: joi_1.default.string().required(),
    })))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendSocialPhoneOtp", null);
__decorate([
    (0, common_1.Post)('social/phone/verify-otp'),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 300_000 } }),
    __param(0, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        socialVerificationToken: joi_1.default.string().required(),
        phone: joi_1.default.string().required(),
        otp: joi_1.default.string().required(),
        fcmToken: joi_1.default.string().optional(),
        ...sessionDeviceFields,
    })))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifySocialPhoneOtp", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    (0, swagger_1.ApiTags)('Authentication'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        otp_service_1.OtpService,
        twilio_service_1.TwilioService,
        users_service_1.UsersService,
        auth_session_service_1.AuthSessionService,
        social_auth_service_1.SocialAuthService,
        legal_service_1.LegalService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map