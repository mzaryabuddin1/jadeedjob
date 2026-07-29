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
exports.OptionalJwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const auth_session_service_1 = require("./auth-session.service");
let OptionalJwtAuthGuard = class OptionalJwtAuthGuard {
    constructor(authSessionService) {
        this.authSessionService = authSessionService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authHeader = String(request.headers.authorization || '').trim();
        if (!authHeader) {
            request.user = null;
            return true;
        }
        request.user =
            await this.authSessionService.validateAuthorizationHeader(authHeader);
        return true;
    }
};
exports.OptionalJwtAuthGuard = OptionalJwtAuthGuard;
exports.OptionalJwtAuthGuard = OptionalJwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [auth_session_service_1.AuthSessionService])
], OptionalJwtAuthGuard);
//# sourceMappingURL=optional-jwt-auth.guard.js.map