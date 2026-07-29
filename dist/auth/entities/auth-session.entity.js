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
exports.AuthSession = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
let AuthSession = class AuthSession {
};
exports.AuthSession = AuthSession;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AuthSession.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], AuthSession.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({
        name: 'userId',
        foreignKeyConstraintName: 'FK_auth_sessions_user',
    }),
    __metadata("design:type", user_entity_1.User)
], AuthSession.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 120 }),
    __metadata("design:type", String)
], AuthSession.prototype, "installationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 64 }),
    __metadata("design:type", String)
], AuthSession.prototype, "refreshTokenHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], AuthSession.prototype, "tokenVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['ios', 'android', 'web', 'unknown'],
        default: 'unknown',
    }),
    __metadata("design:type", String)
], AuthSession.prototype, "platform", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 120 }),
    __metadata("design:type", String)
], AuthSession.prototype, "deviceName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 40 }),
    __metadata("design:type", String)
], AuthSession.prototype, "appVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], AuthSession.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], AuthSession.prototype, "lastUsedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], AuthSession.prototype, "revokedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 80 }),
    __metadata("design:type", String)
], AuthSession.prototype, "revokedReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], AuthSession.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AuthSession.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], AuthSession.prototype, "updatedAt", void 0);
exports.AuthSession = AuthSession = __decorate([
    (0, typeorm_1.Entity)('auth_sessions'),
    (0, typeorm_1.Index)('IDX_auth_sessions_user_installation', ['userId', 'installationId']),
    (0, typeorm_1.Index)('IDX_auth_sessions_expiry_revoked', ['expiresAt', 'revokedAt'])
], AuthSession);
//# sourceMappingURL=auth-session.entity.js.map