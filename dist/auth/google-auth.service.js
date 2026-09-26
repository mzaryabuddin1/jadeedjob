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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleAuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const google_auth_library_1 = require("google-auth-library");
let GoogleAuthService = class GoogleAuthService {
    constructor(configService) {
        this.configService = configService;
        this.oauthClient = new google_auth_library_1.OAuth2Client();
    }
    normalizeToken(raw) {
        let token = (raw || '').trim();
        if (token.toLowerCase().startsWith('bearer ')) {
            token = token.slice(7).trim();
        }
        return token;
    }
    getClientIds() {
        const raw = this.configService.get('GOOGLE_CLIENT_ID') || '';
        return raw
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean);
    }
    async getProfileFromToken(rawToken) {
        const idToken = this.normalizeToken(rawToken);
        if (!idToken) {
            throw new common_1.UnauthorizedException('idToken is required');
        }
        const audiences = this.getClientIds();
        if (!audiences.length) {
            throw new common_1.ServiceUnavailableException('Set GOOGLE_CLIENT_ID in .env (your OAuth Web/Android client id)');
        }
        try {
            const ticket = await this.oauthClient.verifyIdToken({
                idToken,
                audience: audiences,
            });
            const payload = ticket.getPayload();
            if (!payload?.sub) {
                throw new common_1.UnauthorizedException('Invalid Google token');
            }
            return {
                providerId: payload.sub,
                email: payload.email?.toLowerCase() ?? null,
                firstName: payload.given_name || payload.name?.split(' ')[0] || 'User',
                lastName: payload.family_name ||
                    payload.name?.split(' ').slice(1).join(' ') ||
                    '',
                picture: payload.picture ?? null,
            };
        }
        catch (err) {
            if (err instanceof common_1.UnauthorizedException ||
                err instanceof common_1.ServiceUnavailableException) {
                throw err;
            }
            const detail = err instanceof Error ? err.message : 'token verification failed';
            console.error('[GoogleAuth] verifyIdToken failed:', detail, {
                audiences,
            });
            throw new common_1.UnauthorizedException(`Invalid or expired Google token (${detail}). Ensure GOOGLE_CLIENT_ID matches the Web client that issued the idToken, then restart the server.`);
        }
    }
};
exports.GoogleAuthService = GoogleAuthService;
exports.GoogleAuthService = GoogleAuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GoogleAuthService);
//# sourceMappingURL=google-auth.service.js.map