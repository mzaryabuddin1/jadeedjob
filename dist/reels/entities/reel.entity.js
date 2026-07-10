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
exports.Reel = void 0;
const typeorm_1 = require("typeorm");
const job_entity_1 = require("../../job/entities/job.entity");
const user_entity_1 = require("../../users/entities/user.entity");
let Reel = class Reel {
};
exports.Reel = Reel;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Reel.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], Reel.prototype, "creatorId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'creatorId' }),
    __metadata("design:type", user_entity_1.User)
], Reel.prototype, "creator", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Reel.prototype, "caption", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['community', 'jobs', 'social'],
    }),
    __metadata("design:type", String)
], Reel.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'Original audio' }),
    __metadata("design:type", String)
], Reel.prototype, "audioTitle", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Reel.prototype, "linkedJobId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => job_entity_1.Job, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'linkedJobId' }),
    __metadata("design:type", job_entity_1.Job)
], Reel.prototype, "linkedJob", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['public', 'followers', 'draft'],
        default: 'public',
    }),
    __metadata("design:type", String)
], Reel.prototype, "visibility", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['upload_pending', 'processing', 'published', 'draft', 'failed', 'deleted'],
        default: 'upload_pending',
    }),
    __metadata("design:type", String)
], Reel.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Reel.prototype, "allowComments", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Reel.prototype, "allowSharing", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 2000 }),
    __metadata("design:type", String)
], Reel.prototype, "videoUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Reel.prototype, "storageKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Reel.prototype, "originalFileName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Reel.prototype, "contentType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', unsigned: true, nullable: true }),
    __metadata("design:type", Number)
], Reel.prototype, "fileSizeBytes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', unsigned: true, nullable: true }),
    __metadata("design:type", Number)
], Reel.prototype, "durationSeconds", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], Reel.prototype, "likesCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], Reel.prototype, "commentsCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], Reel.prototype, "savesCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], Reel.prototype, "sharesCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], Reel.prototype, "publishedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], Reel.prototype, "processedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], Reel.prototype, "deletedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Reel.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Reel.prototype, "updatedAt", void 0);
exports.Reel = Reel = __decorate([
    (0, typeorm_1.Entity)('reels'),
    (0, typeorm_1.Index)(['status', 'visibility', 'createdAt']),
    (0, typeorm_1.Index)(['creatorId', 'createdAt'])
], Reel);
//# sourceMappingURL=reel.entity.js.map