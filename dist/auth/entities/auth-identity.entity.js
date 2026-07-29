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
exports.AuthIdentity = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
let AuthIdentity = class AuthIdentity {
};
exports.AuthIdentity = AuthIdentity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], AuthIdentity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], AuthIdentity.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({
        name: 'userId',
        foreignKeyConstraintName: 'FK_auth_identities_user',
    }),
    __metadata("design:type", user_entity_1.User)
], AuthIdentity.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['google', 'facebook'] }),
    __metadata("design:type", String)
], AuthIdentity.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], AuthIdentity.prototype, "subject", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AuthIdentity.prototype, "providerEmail", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], AuthIdentity.prototype, "providerMetadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AuthIdentity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], AuthIdentity.prototype, "updatedAt", void 0);
exports.AuthIdentity = AuthIdentity = __decorate([
    (0, typeorm_1.Entity)('auth_identities'),
    (0, typeorm_1.Unique)('UQ_auth_identities_provider_subject', ['provider', 'subject']),
    (0, typeorm_1.Index)('IDX_auth_identities_user_provider', ['userId', 'provider'])
], AuthIdentity);
//# sourceMappingURL=auth-identity.entity.js.map