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
exports.AuthSocialChallenge = void 0;
const typeorm_1 = require("typeorm");
let AuthSocialChallenge = class AuthSocialChallenge {
};
exports.AuthSocialChallenge = AuthSocialChallenge;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ length: 36 }),
    __metadata("design:type", String)
], AuthSocialChallenge.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['google', 'facebook'] }),
    __metadata("design:type", String)
], AuthSocialChallenge.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], AuthSocialChallenge.prototype, "subject", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], AuthSocialChallenge.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], AuthSocialChallenge.prototype, "usedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AuthSocialChallenge.prototype, "createdAt", void 0);
exports.AuthSocialChallenge = AuthSocialChallenge = __decorate([
    (0, typeorm_1.Entity)('auth_social_challenges'),
    (0, typeorm_1.Index)('IDX_auth_social_challenges_expiry_used', ['expiresAt', 'usedAt'])
], AuthSocialChallenge);
//# sourceMappingURL=auth-social-challenge.entity.js.map