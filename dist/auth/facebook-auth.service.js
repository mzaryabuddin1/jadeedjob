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
exports.FacebookAuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let FacebookAuthService = class FacebookAuthService {
    constructor(configService) {
        this.configService = configService;
    }
    getAppId() {
        return (this.configService.get('FACEBOOK_APP_ID') || '').trim();
    }
    getAppSecret() {
        return (this.configService.get('FACEBOOK_APP_SECRET') || '').trim();
    }
    normalizeToken(raw) {
        let token = (raw || '').trim();
        if (token.toLowerCase().startsWith('bearer ')) {
            token = token.slice(7).trim();
        }
        return token;
    }
    async graphGet(path, params) {
        const url = new URL(`https://graph.facebook.com/v21.0${path}`);
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        const res = await fetch(url.toString());
        const data = await res.json();
        if (!res.ok) {
            const msg = data?.error?.message ||
                'Facebook API error';
            throw new common_1.UnauthorizedException(msg);
        }
        return data;
    }
    async debugToken(accessToken) {
        const appId = this.getAppId();
        const appSecret = this.getAppSecret();
        if (!appId || !appSecret) {
            throw new common_1.ServiceUnavailableException('Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in .env');
        }
        const appAccessToken = `${appId}|${appSecret}`;
        const data = await this.graphGet('/debug_token', {
            input_token: accessToken,
            access_token: appAccessToken,
        });
        if (!data.data?.is_valid || !data.data.user_id) {
            throw new common_1.UnauthorizedException('Invalid Facebook access token');
        }
        if (data.data.app_id && data.data.app_id !== appId) {
            throw new common_1.UnauthorizedException('Token was not issued for this app');
        }
        return { user_id: data.data.user_id };
    }
    async getProfileFromToken(rawToken) {
        const accessToken = this.normalizeToken(rawToken);
        if (!accessToken) {
            throw new common_1.UnauthorizedException('accessToken is required');
        }
        try {
            await this.debugToken(accessToken);
            const me = await this.graphGet('/me', {
                access_token: accessToken,
                fields: 'id,email,first_name,last_name,name,picture.type(large)',
            });
            const nameParts = (me.name || 'User').trim().split(/\s+/);
            return {
                providerId: me.id,
                email: me.email?.toLowerCase() ?? null,
                firstName: me.first_name || nameParts[0] || 'User',
                lastName: me.last_name || nameParts.slice(1).join(' ') || '',
                picture: me.picture?.data?.url ?? null,
            };
        }
        catch (err) {
            if (err instanceof common_1.UnauthorizedException ||
                err instanceof common_1.ServiceUnavailableException) {
                throw err;
            }
            throw new common_1.UnauthorizedException('Invalid or expired Facebook token. Use the access token from Facebook Login.');
        }
    }
};
exports.FacebookAuthService = FacebookAuthService;
exports.FacebookAuthService = FacebookAuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FacebookAuthService);
//# sourceMappingURL=facebook-auth.service.js.map