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
exports.AccountDeletionRequest = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
let AccountDeletionRequest = class AccountDeletionRequest {
};
exports.AccountDeletionRequest = AccountDeletionRequest;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], AccountDeletionRequest.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], AccountDeletionRequest.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({
        name: 'userId',
        foreignKeyConstraintName: 'FK_account_deletion_requests_user',
    }),
    __metadata("design:type", user_entity_1.User)
], AccountDeletionRequest.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['scheduled', 'recovered', 'completed', 'cancelled'],
        default: 'scheduled',
    }),
    __metadata("design:type", String)
], AccountDeletionRequest.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], AccountDeletionRequest.prototype, "scheduledDeletionAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], AccountDeletionRequest.prototype, "recoveredAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], AccountDeletionRequest.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], AccountDeletionRequest.prototype, "blockerSnapshot", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AccountDeletionRequest.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], AccountDeletionRequest.prototype, "updatedAt", void 0);
exports.AccountDeletionRequest = AccountDeletionRequest = __decorate([
    (0, typeorm_1.Entity)('account_deletion_requests'),
    (0, typeorm_1.Index)('IDX_account_deletion_status_schedule', [
        'status',
        'scheduledDeletionAt',
    ])
], AccountDeletionRequest);
//# sourceMappingURL=account-deletion-request.entity.js.map