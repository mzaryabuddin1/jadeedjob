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
exports.ReelReport = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const reel_entity_1 = require("./reel.entity");
let ReelReport = class ReelReport {
};
exports.ReelReport = ReelReport;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ReelReport.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ReelReport.prototype, "reelId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => reel_entity_1.Reel, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({
        name: 'reelId',
        foreignKeyConstraintName: 'FK_reel_reports_reel',
    }),
    __metadata("design:type", reel_entity_1.Reel)
], ReelReport.prototype, "reel", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ReelReport.prototype, "reporterUserId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({
        name: 'reporterUserId',
        foreignKeyConstraintName: 'FK_reel_reports_reporter',
    }),
    __metadata("design:type", user_entity_1.User)
], ReelReport.prototype, "reporter", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['spam', 'unsafe', 'false_information', 'other'],
    }),
    __metadata("design:type", String)
], ReelReport.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ReelReport.prototype, "details", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['pending', 'reviewed', 'dismissed', 'actioned'],
        default: 'pending',
    }),
    __metadata("design:type", String)
], ReelReport.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], ReelReport.prototype, "resolvedByAdminId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({
        name: 'resolvedByAdminId',
        foreignKeyConstraintName: 'FK_reel_reports_resolver',
    }),
    __metadata("design:type", user_entity_1.User)
], ReelReport.prototype, "resolvedByAdmin", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ReelReport.prototype, "resolutionNote", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], ReelReport.prototype, "resolvedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ReelReport.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ReelReport.prototype, "updatedAt", void 0);
exports.ReelReport = ReelReport = __decorate([
    (0, typeorm_1.Entity)('reel_reports'),
    (0, typeorm_1.Unique)('UQ_reel_reports_reel_reporter', ['reelId', 'reporterUserId']),
    (0, typeorm_1.Index)('IDX_reel_reports_status_created', ['status', 'createdAt'])
], ReelReport);
//# sourceMappingURL=reel-report.entity.js.map