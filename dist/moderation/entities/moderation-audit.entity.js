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
exports.ModerationAudit = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const moderation_report_entity_1 = require("./moderation-report.entity");
let ModerationAudit = class ModerationAudit {
};
exports.ModerationAudit = ModerationAudit;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ModerationAudit.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ModerationAudit.prototype, "reportId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => moderation_report_entity_1.ModerationReport, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({
        name: 'reportId',
        foreignKeyConstraintName: 'FK_moderation_audits_report',
    }),
    __metadata("design:type", moderation_report_entity_1.ModerationReport)
], ModerationAudit.prototype, "report", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], ModerationAudit.prototype, "actorUserId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({
        name: 'actorUserId',
        foreignKeyConstraintName: 'FK_moderation_audits_actor',
    }),
    __metadata("design:type", user_entity_1.User)
], ModerationAudit.prototype, "actor", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 60 }),
    __metadata("design:type", String)
], ModerationAudit.prototype, "event", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ModerationAudit.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ModerationAudit.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 255 }),
    __metadata("design:type", String)
], ModerationAudit.prototype, "dedupeKey", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ModerationAudit.prototype, "createdAt", void 0);
exports.ModerationAudit = ModerationAudit = __decorate([
    (0, typeorm_1.Entity)('moderation_audits'),
    (0, typeorm_1.Index)('IDX_moderation_audits_report_created', ['reportId', 'createdAt']),
    (0, typeorm_1.Index)('UQ_moderation_audits_dedupe_key', ['dedupeKey'], { unique: true })
], ModerationAudit);
//# sourceMappingURL=moderation-audit.entity.js.map