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
exports.ModerationReport = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
let ModerationReport = class ModerationReport {
};
exports.ModerationReport = ModerationReport;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ModerationReport.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: [
            'post',
            'post_comment',
            'reel',
            'reel_comment',
            'user',
            'company',
            'chat_message',
            'job',
        ],
    }),
    __metadata("design:type", String)
], ModerationReport.prototype, "targetType", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 64 }),
    __metadata("design:type", String)
], ModerationReport.prototype, "targetId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ModerationReport.prototype, "reporterUserId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({
        name: 'reporterUserId',
        foreignKeyConstraintName: 'FK_moderation_reports_reporter',
    }),
    __metadata("design:type", user_entity_1.User)
], ModerationReport.prototype, "reporter", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], ModerationReport.prototype, "targetOwnerUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], ModerationReport.prototype, "targetCompanyId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 255 }),
    __metadata("design:type", String)
], ModerationReport.prototype, "activeKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 40 }),
    __metadata("design:type", String)
], ModerationReport.prototype, "legacySourceType", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], ModerationReport.prototype, "legacySourceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 80 }),
    __metadata("design:type", String)
], ModerationReport.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ModerationReport.prototype, "details", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ModerationReport.prototype, "targetSnapshot", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['pending', 'dismissed', 'actioned'],
        default: 'pending',
    }),
    __metadata("design:type", String)
], ModerationReport.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['dismiss', 'hide', 'remove', 'warn', 'suspend', 'ban'],
        nullable: true,
    }),
    __metadata("design:type", String)
], ModerationReport.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], ModerationReport.prototype, "reviewedByAdminId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({
        name: 'reviewedByAdminId',
        foreignKeyConstraintName: 'FK_moderation_reports_reviewer',
    }),
    __metadata("design:type", user_entity_1.User)
], ModerationReport.prototype, "reviewer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ModerationReport.prototype, "resolutionNotes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], ModerationReport.prototype, "suspensionEndsAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], ModerationReport.prototype, "resolvedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ModerationReport.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ModerationReport.prototype, "updatedAt", void 0);
exports.ModerationReport = ModerationReport = __decorate([
    (0, typeorm_1.Entity)('moderation_reports'),
    (0, typeorm_1.Index)('IDX_moderation_reports_status_created', ['status', 'createdAt']),
    (0, typeorm_1.Index)('IDX_moderation_reports_target', ['targetType', 'targetId']),
    (0, typeorm_1.Index)('UQ_moderation_reports_active_key', ['activeKey'], { unique: true }),
    (0, typeorm_1.Index)('UQ_moderation_reports_legacy_source', ['legacySourceType', 'legacySourceId'], {
        unique: true,
    })
], ModerationReport);
//# sourceMappingURL=moderation-report.entity.js.map