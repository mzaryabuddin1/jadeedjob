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
exports.SocialAuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const google_auth_library_1 = require("google-auth-library");
const jwt = __importStar(require("jsonwebtoken"));
const typeorm_2 = require("typeorm");
const crypto_1 = require("crypto");
const api_exception_1 = require("../common/errors/api-exception");
const auth_identity_entity_1 = require("./entities/auth-identity.entity");
const auth_service_1 = require("./auth.service");
const auth_social_challenge_entity_1 = require("./entities/auth-social-challenge.entity");
let SocialAuthService = class SocialAuthService {
    constructor(identityRepo, challengeRepo, authService) {
        this.identityRepo = identityRepo;
        this.challengeRepo = challengeRepo;
        this.authService = authService;
        this.googleClient = new google_auth_library_1.OAuth2Client();
    }
    async verifyGoogle(idToken) {
        try {
            const audiences = (process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || '')
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
            if (!audiences.length)
                throw new Error('Google client ID is not configured');
            const ticket = await this.googleClient.verifyIdToken({
                idToken,
                audience: audiences,
            });
            const payload = ticket.getPayload();
            if (!payload?.sub)
                throw new Error('Google token has no subject');
            const names = this.splitName(payload.name || payload.given_name || 'JobsLoot User');
            return {
                provider: 'google',
                subject: payload.sub,
                firstName: payload.given_name || names.firstName,
                lastName: payload.family_name || names.lastName,
                email: payload.email_verified ? payload.email : undefined,
                picture: payload.picture,
            };
        }
        catch (error) {
            if (error.message.includes('configured')) {
                throw new common_1.BadGatewayException({
                    code: 'AUTH_SOCIAL_PROVIDER_UNAVAILABLE',
                    message: 'Google authentication is not configured',
                });
            }
            throw new common_1.UnauthorizedException({
                code: 'AUTH_SOCIAL_TOKEN_INVALID',
                message: 'Invalid Google identity token',
            });
        }
    }
    async verifyFacebook(accessToken) {
        const appId = process.env.FACEBOOK_APP_ID;
        const appSecret = process.env.FACEBOOK_APP_SECRET;
        if (!appId || !appSecret) {
            throw new common_1.BadGatewayException({
                code: 'AUTH_SOCIAL_PROVIDER_UNAVAILABLE',
                message: 'Facebook authentication is not configured',
            });
        }
        try {
            const appToken = `${appId}|${appSecret}`;
            const debugUrl = new URL('https://graph.facebook.com/debug_token');
            debugUrl.searchParams.set('input_token', accessToken);
            debugUrl.searchParams.set('access_token', appToken);
            const debugResponse = await fetch(debugUrl);
            const debug = await debugResponse.json();
            if (!debugResponse.ok ||
                !debug?.data?.is_valid ||
                String(debug.data.app_id) !== String(appId) ||
                !debug.data.user_id) {
                throw new Error('Invalid token');
            }
            const profileUrl = new URL(`https://graph.facebook.com/${debug.data.user_id}`);
            profileUrl.searchParams.set('fields', 'id,first_name,last_name,name,email,picture');
            profileUrl.searchParams.set('access_token', accessToken);
            const profileResponse = await fetch(profileUrl);
            const profile = await profileResponse.json();
            if (!profileResponse.ok || !profile?.id)
                throw new Error('Invalid profile');
            const names = this.splitName(profile.name || 'JobsLoot User');
            return {
                provider: 'facebook',
                subject: String(profile.id),
                firstName: profile.first_name || names.firstName,
                lastName: profile.last_name || names.lastName,
                email: profile.email,
                picture: profile.picture?.data?.url,
            };
        }
        catch (error) {
            throw new common_1.UnauthorizedException({
                code: 'AUTH_SOCIAL_TOKEN_INVALID',
                message: 'Invalid Facebook access token',
            });
        }
    }
    async findLinkedUser(profile) {
        const identity = await this.identityRepo.findOne({
            where: { provider: profile.provider, subject: profile.subject },
            relations: ['user'],
        });
        return identity?.user || null;
    }
    async createPhoneChallenge(profile) {
        const challengeId = (0, crypto_1.randomUUID)();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await this.challengeRepo.save(this.challengeRepo.create({
            id: challengeId,
            provider: profile.provider,
            subject: profile.subject,
            expiresAt,
        }));
        const token = jwt.sign({
            type: 'social_phone_challenge',
            ...profile,
        }, this.challengeSecret(), { expiresIn: 10 * 60, jwtid: challengeId });
        return {
            code: 'AUTH_SOCIAL_PHONE_REQUIRED',
            message: 'Phone verification is required to finish social sign-in',
            socialVerificationToken: token,
            expiresIn: 600,
            profilePreview: {
                firstName: profile.firstName,
                lastName: profile.lastName,
                picture: profile.picture || null,
            },
        };
    }
    async verifyPhoneChallenge(token) {
        try {
            const decoded = jwt.verify(token, this.challengeSecret());
            if (typeof decoded === 'string' ||
                decoded.type !== 'social_phone_challenge' ||
                !['google', 'facebook'].includes(decoded.provider) ||
                !decoded.subject ||
                !decoded.jti) {
                throw new Error('Invalid challenge');
            }
            const record = await this.challengeRepo.findOne({
                where: { id: String(decoded.jti) },
            });
            if (!record ||
                record.usedAt ||
                record.expiresAt <= new Date() ||
                record.provider !== decoded.provider ||
                record.subject !== decoded.subject) {
                throw new Error('Challenge is no longer available');
            }
            return decoded;
        }
        catch {
            throw new api_exception_1.ApiException(common_1.HttpStatus.UNAUTHORIZED, 'AUTH_SOCIAL_CHALLENGE_INVALID', 'Social verification challenge is invalid or expired');
        }
    }
    async consumePhoneChallenge(token) {
        const profile = await this.verifyPhoneChallenge(token);
        return this.challengeRepo.manager.transaction(async (manager) => {
            const record = await manager.getRepository(auth_social_challenge_entity_1.AuthSocialChallenge).findOne({
                where: { id: profile.jti },
                lock: { mode: 'pessimistic_write' },
            });
            if (!record || record.usedAt || record.expiresAt <= new Date()) {
                throw new api_exception_1.ApiException(common_1.HttpStatus.UNAUTHORIZED, 'AUTH_SOCIAL_CHALLENGE_INVALID', 'Social verification challenge is invalid or expired');
            }
            record.usedAt = new Date();
            await manager.save(record);
            return profile;
        });
    }
    async linkVerifiedPhone(profile, phone) {
        const existingIdentity = await this.identityRepo.findOne({
            where: { provider: profile.provider, subject: profile.subject },
            relations: ['user'],
        });
        if (existingIdentity)
            return existingIdentity.user;
        let user = await this.authService.findUserByPhone(phone);
        if (!user) {
            user = await this.authService.createSocialUser({
                phone,
                firstName: profile.firstName,
                lastName: profile.lastName,
                email: profile.email,
                profilePhoto: profile.picture,
            });
        }
        const sameProvider = await this.identityRepo.findOne({
            where: { userId: user.id, provider: profile.provider },
        });
        if (sameProvider && sameProvider.subject !== profile.subject) {
            throw new common_1.ConflictException({
                code: 'AUTH_SOCIAL_IDENTITY_CONFLICT',
                message: 'This account is already linked to another provider identity',
            });
        }
        try {
            await this.identityRepo.save(this.identityRepo.create({
                userId: user.id,
                provider: profile.provider,
                subject: profile.subject,
                providerEmail: profile.email || null,
                providerMetadata: { picture: profile.picture || null },
            }));
        }
        catch {
            const raced = await this.identityRepo.findOne({
                where: { provider: profile.provider, subject: profile.subject },
                relations: ['user'],
            });
            if (!raced)
                throw new common_1.ConflictException('Unable to link social identity');
            user = raced.user;
        }
        return user;
    }
    challengeSecret() {
        const secret = process.env.SOCIAL_CHALLENGE_SECRET || process.env.JWT_SECRET;
        if (!secret)
            throw new Error('SOCIAL_CHALLENGE_SECRET is required');
        return secret;
    }
    splitName(value) {
        const parts = value.trim().split(/\s+/);
        return {
            firstName: parts.shift() || 'JobsLoot',
            lastName: parts.join(' ') || 'User',
        };
    }
};
exports.SocialAuthService = SocialAuthService;
exports.SocialAuthService = SocialAuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(auth_identity_entity_1.AuthIdentity)),
    __param(1, (0, typeorm_1.InjectRepository)(auth_social_challenge_entity_1.AuthSocialChallenge)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        auth_service_1.AuthService])
], SocialAuthService);
//# sourceMappingURL=social-auth.service.js.map