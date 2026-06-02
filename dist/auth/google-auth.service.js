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
        this.client = new google_auth_library_1.OAuth2Client();
    }
    getAudiences() {
        const raw = this.configService.get('GOOGLE_CLIENT_ID') || '';
        return raw
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean);
    }
    async verifyIdToken(idToken) {
        const audiences = this.getAudiences();
        if (!audiences.length) {
            throw new common_1.ServiceUnavailableException('Google sign-in is not configured (set GOOGLE_CLIENT_ID in .env)');
        }
        try {
            const ticket = await this.client.verifyIdToken({
                idToken,
                audience: audiences,
            });
            const payload = ticket.getPayload();
            if (!payload?.sub) {
                throw new common_1.UnauthorizedException('Invalid Google token');
            }
            return payload;
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired Google token');
        }
    }
};
exports.GoogleAuthService = GoogleAuthService;
exports.GoogleAuthService = GoogleAuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GoogleAuthService);
//# sourceMappingURL=google-auth.service.js.map