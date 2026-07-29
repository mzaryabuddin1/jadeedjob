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
exports.AuthSessionService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const crypto_1 = require("crypto");
const jwt = __importStar(require("jsonwebtoken"));
const typeorm_2 = require("typeorm");
const api_exception_1 = require("../common/errors/api-exception");
const user_entity_1 = require("../users/entities/user.entity");
const auth_session_entity_1 = require("./entities/auth-session.entity");
let AuthSessionService = class AuthSessionService {
    constructor(userRepo, sessionRepo) {
        this.userRepo = userRepo;
        this.sessionRepo = sessionRepo;
        this.accessTokenExpiresIn = 15 * 60;
        this.refreshTokenLifetimeMs = 30 * 24 * 60 * 60 * 1000;
    }
    getBearerToken(authHeader) {
        const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;
        if (!header || !header.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('Missing or invalid Authorization header');
        }
        const token = header.slice('Bearer '.length).trim();
        if (!token) {
            throw new common_1.UnauthorizedException('Missing or invalid Authorization header');
        }
        return token;
    }
    async validateAuthorizationHeader(authHeader) {
        return this.validateToken(this.getBearerToken(authHeader));
    }
    async validateToken(token) {
        let decoded;
        try {
            const value = jwt.verify(token, this.jwtSecret());
            if (typeof value === 'string')
                throw new Error('Invalid token');
            decoded = value;
        }
        catch (error) {
            if (error?.name === 'TokenExpiredError') {
                throw new api_exception_1.ApiException(common_1.HttpStatus.UNAUTHORIZED, 'AUTH_ACCESS_EXPIRED', 'Access token expired');
            }
            throw new api_exception_1.ApiException(common_1.HttpStatus.UNAUTHORIZED, 'AUTH_SESSION_INVALID', 'Invalid or expired token');
        }
        const id = Number(decoded.id ?? decoded.sub);
        if (!Number.isInteger(id) || id <= 0) {
            throw new api_exception_1.ApiException(common_1.HttpStatus.UNAUTHORIZED, 'AUTH_SESSION_INVALID', 'Invalid or expired token');
        }
        const user = await this.userRepo.findOne({
            where: { id },
            select: [
                'id',
                'isBanned',
                'tokenVersion',
                'systemRole',
                'deletionScheduledAt',
                'deletedAt',
            ],
        });
        this.assertUserCanAuthenticate(user);
        const tokenVersion = Number(decoded.tokenVersion ?? 0);
        if (tokenVersion !== Number(user.tokenVersion || 0)) {
            throw new api_exception_1.ApiException(common_1.HttpStatus.UNAUTHORIZED, 'AUTH_SESSION_REVOKED', 'Invalid user session');
        }
        const sid = String(decoded.sid || '');
        if (sid) {
            const session = await this.sessionRepo.findOne({ where: { id: sid } });
            if (!session ||
                session.userId !== id ||
                session.revokedAt ||
                session.expiresAt <= new Date()) {
                throw new api_exception_1.ApiException(common_1.HttpStatus.UNAUTHORIZED, 'AUTH_SESSION_REVOKED', 'Invalid user session');
            }
        }
        else if (!this.legacyTokenAllowed(decoded)) {
            throw new api_exception_1.ApiException(common_1.HttpStatus.UNAUTHORIZED, 'AUTH_SESSION_INVALID', 'Invalid user session');
        }
        return {
            ...decoded,
            id,
            sid: sid || undefined,
            tokenVersion,
            systemRole: user.systemRole || 'user',
        };
    }
    async createSession(user, device = {}) {
        const installationId = String(device.installationId || '').trim() || `legacy:${(0, crypto_1.randomUUID)()}`;
        const now = new Date();
        await this.sessionRepo.update({
            userId: user.id,
            installationId,
            revokedAt: (0, typeorm_2.IsNull)(),
        }, { revokedAt: now, revokedReason: 'replaced_by_login' });
        const sessionId = (0, crypto_1.randomUUID)();
        const secret = (0, crypto_1.randomBytes)(32).toString('base64url');
        const refreshToken = `${sessionId}.${secret}`;
        const session = await this.sessionRepo.save(this.sessionRepo.create({
            id: sessionId,
            userId: user.id,
            installationId,
            refreshTokenHash: this.hashRefreshToken(refreshToken),
            tokenVersion: Number(user.tokenVersion || 0),
            platform: device.platform || 'unknown',
            deviceName: device.deviceName || null,
            appVersion: device.appVersion || null,
            expiresAt: new Date(Date.now() + this.refreshTokenLifetimeMs),
            lastUsedAt: now,
        }));
        return this.tokenResult(user, session, refreshToken);
    }
    async refresh(refreshToken) {
        const [sessionId, secret, ...extra] = String(refreshToken || '').split('.');
        if (!sessionId || !secret || extra.length) {
            throw this.refreshInvalid();
        }
        const outcome = await this.sessionRepo.manager.transaction(async (manager) => {
            const session = await manager.getRepository(auth_session_entity_1.AuthSession).findOne({
                where: { id: sessionId },
                relations: ['user'],
                lock: { mode: 'pessimistic_write' },
            });
            if (!session)
                throw this.refreshInvalid();
            if (session.revokedAt) {
                throw new api_exception_1.ApiException(common_1.HttpStatus.UNAUTHORIZED, 'AUTH_SESSION_REVOKED', 'Refresh session has been revoked');
            }
            if (session.expiresAt <= new Date()) {
                session.revokedAt = new Date();
                session.revokedReason = 'expired';
                await manager.save(session);
                return {
                    ok: false,
                    error: new api_exception_1.ApiException(common_1.HttpStatus.UNAUTHORIZED, 'AUTH_REFRESH_EXPIRED', 'Refresh token expired'),
                };
            }
            const suppliedHash = this.hashRefreshToken(refreshToken);
            if (!this.safeEqual(suppliedHash, session.refreshTokenHash)) {
                session.revokedAt = new Date();
                session.revokedReason = 'refresh_reuse_detected';
                await manager.save(session);
                return {
                    ok: false,
                    error: new api_exception_1.ApiException(common_1.HttpStatus.UNAUTHORIZED, 'AUTH_REFRESH_REUSE_DETECTED', 'Refresh token reuse detected; this session was revoked'),
                };
            }
            const user = session.user;
            this.assertUserCanAuthenticate(user);
            if (session.tokenVersion !== Number(user.tokenVersion || 0)) {
                session.revokedAt = new Date();
                session.revokedReason = 'token_version_changed';
                await manager.save(session);
                return {
                    ok: false,
                    error: new api_exception_1.ApiException(common_1.HttpStatus.UNAUTHORIZED, 'AUTH_SESSION_REVOKED', 'Invalid user session'),
                };
            }
            const nextToken = `${session.id}.${(0, crypto_1.randomBytes)(32).toString('base64url')}`;
            session.refreshTokenHash = this.hashRefreshToken(nextToken);
            session.lastUsedAt = new Date();
            await manager.save(session);
            return {
                ok: true,
                value: this.tokenResult(user, session, nextToken),
            };
        });
        if (!outcome.ok)
            throw outcome.error;
        return outcome.value;
    }
    async revokeSession(sessionId, reason = 'logout') {
        if (!sessionId)
            return;
        await this.sessionRepo.update({ id: sessionId, revokedAt: (0, typeorm_2.IsNull)() }, { revokedAt: new Date(), revokedReason: reason });
    }
    async revokeAllForUser(userId, reason = 'logout_all') {
        await this.sessionRepo.update({ userId, revokedAt: (0, typeorm_2.IsNull)() }, { revokedAt: new Date(), revokedReason: reason });
    }
    async listActiveForUser(userId) {
        return this.sessionRepo.find({
            where: { userId, revokedAt: (0, typeorm_2.IsNull)() },
            order: { lastUsedAt: 'DESC' },
        });
    }
    tokenResult(user, session, refreshToken) {
        const accessToken = jwt.sign({
            id: user.id,
            sub: String(user.id),
            sid: session.id,
            tokenVersion: Number(user.tokenVersion || 0),
            type: 'access',
        }, this.jwtSecret(), { expiresIn: this.accessTokenExpiresIn });
        return {
            userId: user.id,
            accessToken,
            access_token: accessToken,
            refreshToken,
            accessTokenExpiresIn: this.accessTokenExpiresIn,
            sessionId: session.id,
            installationId: session.installationId,
        };
    }
    assertUserCanAuthenticate(user) {
        if (!user) {
            throw new api_exception_1.ApiException(common_1.HttpStatus.UNAUTHORIZED, 'AUTH_SESSION_INVALID', 'Invalid user session');
        }
        if (user.isBanned) {
            throw new api_exception_1.ApiException(common_1.HttpStatus.FORBIDDEN, 'AUTH_ACCOUNT_BANNED', 'Your account is blocked');
        }
        if (user.deletedAt) {
            throw new api_exception_1.ApiException(common_1.HttpStatus.UNAUTHORIZED, 'AUTH_ACCOUNT_DELETED', 'This account is no longer available');
        }
        if (user.deletionScheduledAt) {
            throw new api_exception_1.ApiException(common_1.HttpStatus.CONFLICT, 'ACCOUNT_PENDING_DELETION', 'Account deletion is pending; recover the account to continue', { scheduledDeletionAt: user.deletionScheduledAt });
        }
    }
    legacyTokenAllowed(payload) {
        if (process.env.NODE_ENV !== 'production') {
            return process.env.ALLOW_LEGACY_ACCESS_TOKENS !== 'false';
        }
        const grace = process.env.LEGACY_ACCESS_TOKEN_GRACE_UNTIL;
        if (!grace)
            return false;
        const cutoff = new Date(grace);
        return !Number.isNaN(cutoff.getTime()) && cutoff > new Date();
    }
    refreshInvalid() {
        return new api_exception_1.ApiException(common_1.HttpStatus.UNAUTHORIZED, 'AUTH_REFRESH_INVALID', 'Invalid refresh token');
    }
    hashRefreshToken(value) {
        return (0, crypto_1.createHash)('sha256').update(value).digest('hex');
    }
    safeEqual(a, b) {
        const left = Buffer.from(a);
        const right = Buffer.from(b || '');
        return left.length === right.length && (0, crypto_1.timingSafeEqual)(left, right);
    }
    jwtSecret() {
        const secret = process.env.JWT_SECRET;
        if (!secret)
            throw new Error('JWT_SECRET is required');
        return secret;
    }
};
exports.AuthSessionService = AuthSessionService;
exports.AuthSessionService = AuthSessionService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(auth_session_entity_1.AuthSession)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], AuthSessionService);
//# sourceMappingURL=auth-session.service.js.map