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
exports.IdempotencyRecord = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
let IdempotencyRecord = class IdempotencyRecord {
};
exports.IdempotencyRecord = IdempotencyRecord;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], IdempotencyRecord.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], IdempotencyRecord.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({
        name: 'userId',
        foreignKeyConstraintName: 'FK_idempotency_records_user',
    }),
    __metadata("design:type", user_entity_1.User)
], IdempotencyRecord.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 80 }),
    __metadata("design:type", String)
], IdempotencyRecord.prototype, "scope", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 120 }),
    __metadata("design:type", String)
], IdempotencyRecord.prototype, "requestKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 64 }),
    __metadata("design:type", String)
], IdempotencyRecord.prototype, "requestHash", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['processing', 'completed'],
        default: 'processing',
    }),
    __metadata("design:type", String)
], IdempotencyRecord.prototype, "state", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], IdempotencyRecord.prototype, "responseStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], IdempotencyRecord.prototype, "responseBody", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], IdempotencyRecord.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], IdempotencyRecord.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], IdempotencyRecord.prototype, "updatedAt", void 0);
exports.IdempotencyRecord = IdempotencyRecord = __decorate([
    (0, typeorm_1.Entity)('idempotency_records'),
    (0, typeorm_1.Unique)('UQ_idempotency_user_scope_key', ['userId', 'scope', 'requestKey']),
    (0, typeorm_1.Index)('IDX_idempotency_expiry', ['expiresAt'])
], IdempotencyRecord);
//# sourceMappingURL=idempotency-record.entity.js.map