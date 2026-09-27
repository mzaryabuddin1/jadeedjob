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
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const otp_service_1 = require("../otp/otp.service");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const joi_1 = __importDefault(require("joi"));
const users_service_1 = require("../users/users.service");
const jwt_auth_guard_1 = require("./jwt-auth.guard");
let AuthController = class AuthController {
    constructor(authService, otpService, usersService) {
        this.authService = authService;
        this.otpService = otpService;
        this.usersService = usersService;
    }
    assertValidOtp(key, code, purpose) {
        const entry = this.otpService.getOtpEntry(key);
        if (!entry)
            throw new common_1.UnauthorizedException('OTP not found');
        if (entry.used)
            throw new common_1.UnauthorizedException('OTP already used');
        if (entry.code !== code)
            throw new common_1.UnauthorizedException('Invalid OTP');
        if (new Date() > entry.expiresAt) {
            this.otpService.deleteOtp(key);
            throw new common_1.UnauthorizedException('OTP expired');
        }
        if (purpose && entry.registrationData?.purpose !== purpose) {
            throw new common_1.UnauthorizedException('Invalid OTP purpose');
        }
        return entry;
    }
    async sendOtp(body) {
        const existing = await this.authService.findUserByPhone(body.phone);
        if (existing)
            throw new common_1.BadRequestException('Phone already registered');
        if (body.email) {
            await this.authService.assertEmailAvailable(body.email);
        }
        else {
            delete body.email;
        }
        const { salt, hash } = this.authService.hashPassword(body.password);
        body.passwordHash = hash;
        body.passwordSalt = salt;
        delete body.password;
        const otp = this.otpService.generateOTP(body.phone, {
            ...body,
            purpose: 'register',
        });
        return { message: `OTP sent to ${body.phone}`, otp };
    }
    async verifyOtp(body) {
        const { phone, code, fcmToken = null } = body;
        const entry = this.assertValidOtp(phone, code, 'register');
        this.otpService.markUsed(phone);
        const user = (await this.authService.createOrGetUser({
            ...entry.registrationData,
            isVerified: true,
        }));
        if (fcmToken) {
            await this.authService.attachFcmToken(user.id, fcmToken);
        }
        this.otpService.deleteOtp(phone);
        const fresh = (await this.authService.findUserById(user.id));
        return this.authService.authResponse(fresh);
    }
    async login(dto) {
        const user = await this.authService.validateUser(dto.phone, dto.password);
        if (dto.fcmToken) {
            await this.authService.attachFcmToken(user.id, dto.fcmToken);
        }
        const fresh = (await this.authService.findUserById(user.id));
        return this.authService.authResponse(fresh);
    }
    async googleAuth(body) {
        return this.authService.loginWithGoogle(body.idToken, {
            fcmToken: body.fcmToken,
            country: body.country,
            language: body.language,
        });
    }
    async facebookAuth(body) {
        return this.authService.loginWithFacebook(body.accessToken, {
            fcmToken: body.fcmToken,
            country: body.country,
            language: body.language,
        });
    }
    async sendUpdateEmailOtp(req, body) {
        const userId = req.user.id;
        await this.authService.assertEmailAvailable(body.email, userId);
        const otp = this.otpService.generateOTP(body.email, {
            purpose: 'update-email',
            email: body.email,
            userId,
        });
        return { message: `OTP sent to ${body.email}`, otp };
    }
    async verifyUpdateEmailOtp(req, body) {
        const userId = req.user.id;
        const entry = this.assertValidOtp(body.email, body.code, 'update-email');
        if (entry.registrationData?.userId !== userId) {
            throw new common_1.UnauthorizedException('OTP does not belong to this user');
        }
        this.otpService.markUsed(body.email);
        const user = await this.authService.updateUserEmail(userId, body.email);
        this.otpService.deleteOtp(body.email);
        return {
            message: 'Email updated successfully',
            kyc_complete: this.authService.isKycComplete(user),
            user: this.authService.toPublicUser(user),
        };
    }
    async sendKycOtp(req, body) {
        const phoneTaken = await this.authService.findUserByPhone(body.phone);
        if (body.kycToken) {
            const pending = this.authService.verifyKycToken(body.kycToken);
            const otp = this.otpService.generateOTP(body.phone, {
                purpose: 'kyc',
                mode: 'social_kyc',
                pending,
                phone: body.phone,
                country: body.country ?? pending.country,
                language: body.language ?? pending.language,
                city: body.city,
                phoneExists: !!phoneTaken,
            });
            return {
                message: phoneTaken
                    ? `OTP sent to ${body.phone}. After verify, this social login will link to your existing account.`
                    : `OTP sent to ${body.phone}`,
                otp,
                phone_exists: !!phoneTaken,
            };
        }
        const userId = this.authService.tryGetUserIdFromAuthHeader(req.headers?.authorization) ?? req.user?.id;
        if (!userId) {
            throw new common_1.UnauthorizedException('Provide kycToken (Google/Facebook) or Bearer access_token');
        }
        if (phoneTaken && phoneTaken.id !== userId) {
            throw new common_1.BadRequestException('Phone already registered');
        }
        const otp = this.otpService.generateOTP(body.phone, {
            purpose: 'kyc',
            mode: 'attach_phone',
            userId,
            phone: body.phone,
            country: body.country,
            language: body.language,
            city: body.city,
        });
        return { message: `OTP sent to ${body.phone}`, otp };
    }
    async verifyKycOtp(req, body) {
        const entry = this.assertValidOtp(body.phone, body.code, 'kyc');
        this.otpService.markUsed(body.phone);
        const mode = entry.registrationData?.mode;
        if (mode === 'social_kyc' || mode === 'create_from_social') {
            const pending = entry.registrationData.pending ||
                (body.kycToken
                    ? this.authService.verifyKycToken(body.kycToken)
                    : null);
            if (!pending) {
                throw new common_1.UnauthorizedException('Missing pending social signup data');
            }
            const result = await this.authService.resolveSocialKyc(pending, {
                phone: body.phone,
                country: entry.registrationData.country,
                language: entry.registrationData.language,
                city: entry.registrationData.city,
                fcmToken: pending.fcmToken,
            });
            this.otpService.deleteOtp(body.phone);
            if (result.status === 'needs_confirmation') {
                return {
                    message: result.message,
                    kyc_complete: this.authService.isKycComplete(result.user),
                    requires_link_confirmation: true,
                    link_token: result.link_token,
                    existing_providers: result.existing_providers,
                    ...this.authService.authResponse(result.user, { isNewUser: false }),
                };
            }
            return {
                message: result.isNewUser
                    ? 'Account created successfully'
                    : 'Social account linked successfully',
                ...this.authService.authResponse(result.user, {
                    isNewUser: result.isNewUser,
                }),
            };
        }
        const userId = entry.registrationData?.userId ??
            this.authService.tryGetUserIdFromAuthHeader(req.headers?.authorization) ??
            req.user?.id;
        if (!userId) {
            throw new common_1.UnauthorizedException('Invalid KYC session');
        }
        if (entry.registrationData?.userId &&
            entry.registrationData.userId !== userId) {
            throw new common_1.UnauthorizedException('OTP does not belong to this user');
        }
        const user = await this.authService.completeKyc(userId, {
            phone: body.phone,
            country: entry.registrationData.country,
            language: entry.registrationData.language,
            city: entry.registrationData.city,
        });
        this.otpService.deleteOtp(body.phone);
        return {
            message: 'KYC completed successfully',
            ...this.authService.authResponse(user, { isNewUser: false }),
        };
    }
    async confirmLinkIdentity(body) {
        if (!body.confirm) {
            return {
                message: 'Link cancelled. You can still login with phone or your previously linked social account.',
                linked: false,
            };
        }
        return this.authService.confirmLinkIdentity(body.linkToken);
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
        this.assertValidOtp(phone, code, 'forgot-password');
        const user = await this.authService.findUserByPhone(phone);
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        const { salt, hash } = this.authService.hashPassword(newPassword);
        await this.authService.resetPassword(phone, salt, hash);
        this.otpService.markUsed(phone);
        this.otpService.deleteOtp(phone);
        return { message: 'Password reset successfully' };
    }
    async debugAccounts() {
        if (process.env.NODE_ENV === 'production') {
            throw new common_1.ForbiddenException('Not available in production');
        }
        const accounts = await this.authService.listDebugAccounts();
        return {
            count: accounts.length,
            accounts,
            refreshedAt: new Date().toISOString(),
        };
    }
    async debugDeleteAccount(id) {
        if (process.env.NODE_ENV === 'production') {
            throw new common_1.ForbiddenException('Not available in production');
        }
        return this.authService.deleteDebugAccount(id);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register/send-otp'),
    (0, swagger_1.ApiOperation)({
        summary: 'Register — send OTP to phone',
        description: 'Phone required. Email & city optional. Dev OTP is always **123456**.',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: [
                'firstName',
                'lastName',
                'phone',
                'country',
                'language',
                'password',
            ],
            properties: {
                firstName: { type: 'string', example: 'Ali' },
                lastName: { type: 'string', example: 'Khan' },
                phone: { type: 'string', example: '+923001234567' },
                country: { type: 'number', example: 41, description: 'Country id' },
                language: { type: 'number', example: 2, description: 'Language id' },
                city: {
                    type: 'number',
                    example: 1,
                    description: 'Optional city id',
                },
                password: {
                    type: 'string',
                    example: 'Pass@123',
                    description: 'Min 6 chars; upper, lower, number, special character required',
                },
                email: {
                    type: 'string',
                    example: 'ali@example.com',
                    description: 'Optional, must be unique',
                },
                full_name: { type: 'string', example: 'Ali Khan' },
            },
        },
    }),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        firstName: joi_1.default.string().required(),
        lastName: joi_1.default.string().required(),
        phone: joi_1.default.string().required(),
        country: joi_1.default.number().required(),
        language: joi_1.default.number().required(),
        city: joi_1.default.number().optional(),
        password: joi_1.default.string()
            .min(6)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
            .required(),
        email: joi_1.default.string().email().optional().allow(null, ''),
        full_name: joi_1.default.string().optional(),
    }))),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendOtp", null);
__decorate([
    (0, common_1.Post)('register/verify-otp'),
    (0, swagger_1.ApiOperation)({ summary: 'Register — verify OTP & create account' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['phone', 'code'],
            properties: {
                phone: { type: 'string', example: '+923001234567' },
                code: { type: 'string', example: '123456' },
                fcmToken: { type: 'string', example: 'optional-fcm-token' },
            },
        },
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyOtp", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, swagger_1.ApiOperation)({ summary: 'Login with phone & password' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['phone', 'password'],
            properties: {
                phone: { type: 'string', example: '+923001234567' },
                password: { type: 'string', example: 'Pass@123' },
                fcmToken: { type: 'string' },
            },
        },
    }),
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
    (0, common_1.Post)('google'),
    (0, swagger_1.ApiOperation)({
        summary: 'Google login / signup',
        description: 'Existing user → `access_token` + `kyc_complete`. New user → `kyc_complete: false` + `kyc_token` (no DB account yet). Complete via `/auth/kyc/*` with `kycToken`.',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['idToken'],
            properties: {
                idToken: { type: 'string', example: '<Google Sign-In ID token>' },
                fcmToken: { type: 'string' },
                country: { type: 'number', example: 41 },
                language: { type: 'number', example: 2 },
            },
        },
    }),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        idToken: joi_1.default.string().required(),
        fcmToken: joi_1.default.string().optional(),
        country: joi_1.default.number().optional(),
        language: joi_1.default.number().optional(),
    }))),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "googleAuth", null);
__decorate([
    (0, common_1.Post)('facebook'),
    (0, swagger_1.ApiOperation)({
        summary: 'Facebook login / signup',
        description: 'Existing user → `access_token` + `kyc_complete`. New user → `kyc_complete: false` + `kyc_token` (no DB account yet).',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['accessToken'],
            properties: {
                accessToken: {
                    type: 'string',
                    example: '<Facebook Login access token>',
                },
                fcmToken: { type: 'string' },
                country: { type: 'number', example: 41 },
                language: { type: 'number', example: 2 },
            },
        },
    }),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        accessToken: joi_1.default.string().required(),
        fcmToken: joi_1.default.string().optional(),
        country: joi_1.default.number().optional(),
        language: joi_1.default.number().optional(),
    }))),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "facebookAuth", null);
__decorate([
    (0, common_1.Post)('update-email/send-otp'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update email — send OTP',
        description: 'JWT required. Email must be unique. Dev OTP = 123456',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['email'],
            properties: {
                email: { type: 'string', example: 'newemail@example.com' },
            },
        },
    }),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        email: joi_1.default.string().email().required(),
    }))),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendUpdateEmailOtp", null);
__decorate([
    (0, common_1.Post)('update-email/verify-otp'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT'),
    (0, swagger_1.ApiOperation)({ summary: 'Update email — verify OTP' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['email', 'code'],
            properties: {
                email: { type: 'string', example: 'newemail@example.com' },
                code: { type: 'string', example: '123456' },
            },
        },
    }),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        email: joi_1.default.string().email().required(),
        code: joi_1.default.string().required(),
    }))),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyUpdateEmailOtp", null);
__decorate([
    (0, common_1.Post)('kyc/send-otp'),
    (0, swagger_1.ApiOperation)({
        summary: 'KYC / link — send OTP to phone',
        description: 'Pass `kycToken` from Google/Facebook. If phone already exists, OTP proves ownership for secure linking. Dev OTP = 123456',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['phone'],
            properties: {
                phone: { type: 'string', example: '+923001234567' },
                kycToken: {
                    type: 'string',
                    description: 'From Google/Facebook when kyc_token is returned',
                },
                country: { type: 'number', example: 41 },
                language: { type: 'number', example: 2 },
                city: { type: 'number', example: 1 },
            },
        },
    }),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        phone: joi_1.default.string().required(),
        kycToken: joi_1.default.string().optional(),
        country: joi_1.default.number().optional(),
        language: joi_1.default.number().optional(),
        city: joi_1.default.number().optional(),
    }))),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendKycOtp", null);
__decorate([
    (0, common_1.Post)('kyc/verify-otp'),
    (0, swagger_1.ApiOperation)({
        summary: 'KYC / link — verify phone OTP',
        description: 'Creates a new account OR links social to existing phone account. If that account already has another Google/Facebook, returns `link_token` for confirmation (no overwrite).',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['phone', 'code'],
            properties: {
                phone: { type: 'string', example: '+923001234567' },
                code: { type: 'string', example: '123456' },
                kycToken: { type: 'string' },
            },
        },
    }),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        phone: joi_1.default.string().required(),
        code: joi_1.default.string().required(),
        kycToken: joi_1.default.string().optional(),
    }))),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyKycOtp", null);
__decorate([
    (0, common_1.Post)('link-identity/confirm'),
    (0, swagger_1.ApiOperation)({
        summary: 'Confirm linking an additional Google/Facebook account',
        description: 'Used when verify-otp returns `requires_link_confirmation`. Does not replace existing primary Google/Facebook or email.',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['linkToken', 'confirm'],
            properties: {
                linkToken: { type: 'string' },
                confirm: { type: 'boolean', example: true },
            },
        },
    }),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        linkToken: joi_1.default.string().required(),
        confirm: joi_1.default.boolean().required(),
    }))),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "confirmLinkIdentity", null);
__decorate([
    (0, common_1.Post)('forgot-password/send-otp'),
    (0, swagger_1.ApiOperation)({ summary: 'Forgot password — send OTP' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['phone'],
            properties: {
                phone: { type: 'string', example: '+923001234567' },
            },
        },
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendForgotPasswordOtp", null);
__decorate([
    (0, common_1.Post)('forgot-password/verify-otp'),
    (0, swagger_1.ApiOperation)({ summary: 'Forgot password — verify OTP & reset' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['phone', 'code', 'newPassword'],
            properties: {
                phone: { type: 'string', example: '+923001234567' },
                code: { type: 'string', example: '123456' },
                newPassword: { type: 'string', example: 'NewPass@123' },
            },
        },
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyForgotPasswordOtp", null);
__decorate([
    (0, common_1.Get)('debug/accounts'),
    (0, swagger_1.ApiOperation)({
        summary: '[DEV] List users + social identities',
        description: 'For google-login.html auth lab. Disabled when NODE_ENV=production.',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "debugAccounts", null);
__decorate([
    (0, common_1.Delete)('debug/accounts/:id'),
    (0, swagger_1.ApiOperation)({
        summary: '[DEV] Delete a user + identities',
        description: 'For auth lab cleanup. Disabled when NODE_ENV=production.',
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "debugDeleteAccount", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('Auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        otp_service_1.OtpService,
        users_service_1.UsersService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map