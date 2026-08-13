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
exports.CommunityPost = void 0;
const typeorm_1 = require("typeorm");
const job_entity_1 = require("../../job/entities/job.entity");
const company_page_entity_1 = require("../../pages/entities/company-page.entity");
const user_entity_1 = require("../../users/entities/user.entity");
let CommunityPost = class CommunityPost {
};
exports.CommunityPost = CommunityPost;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], CommunityPost.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], CommunityPost.prototype, "creatorId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { eager: true, onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({
        name: 'creatorId',
        foreignKeyConstraintName: 'FK_community_posts_creator',
    }),
    __metadata("design:type", user_entity_1.User)
], CommunityPost.prototype, "creator", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['user', 'company'], default: 'user' }),
    __metadata("design:type", String)
], CommunityPost.prototype, "publisherType", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], CommunityPost.prototype, "publisherCompanyId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_page_entity_1.CompanyPage, { nullable: true, onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({
        name: 'publisherCompanyId',
        foreignKeyConstraintName: 'FK_community_posts_company',
    }),
    __metadata("design:type", company_page_entity_1.CompanyPage)
], CommunityPost.prototype, "publisherCompany", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], CommunityPost.prototype, "body", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 2000 }),
    __metadata("design:type", String)
], CommunityPost.prototype, "imageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        length: 36,
        charset: 'ascii',
        collation: 'ascii_bin',
    }),
    __metadata("design:type", String)
], CommunityPost.prototype, "imageAssetId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 500 }),
    __metadata("design:type", String)
], CommunityPost.prototype, "imageStorageKey", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['none', 'image', 'video'],
        default: 'none',
    }),
    __metadata("design:type", String)
], CommunityPost.prototype, "mediaType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['published', 'upload_pending', 'failed'],
        default: 'published',
    }),
    __metadata("design:type", String)
], CommunityPost.prototype, "mediaStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 2000 }),
    __metadata("design:type", String)
], CommunityPost.prototype, "videoUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        length: 36,
        charset: 'ascii',
        collation: 'ascii_bin',
    }),
    __metadata("design:type", String)
], CommunityPost.prototype, "videoAssetId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 500 }),
    __metadata("design:type", String)
], CommunityPost.prototype, "videoStorageKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 2000 }),
    __metadata("design:type", String)
], CommunityPost.prototype, "videoThumbnailUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        length: 36,
        charset: 'ascii',
        collation: 'ascii_bin',
    }),
    __metadata("design:type", String)
], CommunityPost.prototype, "videoThumbnailAssetId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 500 }),
    __metadata("design:type", String)
], CommunityPost.prototype, "videoThumbnailStorageKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 100 }),
    __metadata("design:type", String)
], CommunityPost.prototype, "videoContentType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', unsigned: true, nullable: true }),
    __metadata("design:type", Number)
], CommunityPost.prototype, "videoFileSizeBytes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', unsigned: true, nullable: true }),
    __metadata("design:type", Number)
], CommunityPost.prototype, "videoDurationSeconds", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], CommunityPost.prototype, "linkedJobId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => job_entity_1.Job, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({
        name: 'linkedJobId',
        foreignKeyConstraintName: 'FK_community_posts_job',
    }),
    __metadata("design:type", job_entity_1.Job)
], CommunityPost.prototype, "linkedJob", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], CommunityPost.prototype, "allowComments", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], CommunityPost.prototype, "likesCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], CommunityPost.prototype, "commentsCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], CommunityPost.prototype, "savesCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], CommunityPost.prototype, "sharesCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], CommunityPost.prototype, "deletedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['visible', 'hidden', 'removed'],
        default: 'visible',
    }),
    __metadata("design:type", String)
], CommunityPost.prototype, "moderationStatus", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CommunityPost.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], CommunityPost.prototype, "updatedAt", void 0);
exports.CommunityPost = CommunityPost = __decorate([
    (0, typeorm_1.Entity)('community_posts'),
    (0, typeorm_1.Index)('IDX_community_posts_deleted_created', ['deletedAt', 'createdAt']),
    (0, typeorm_1.Index)('IDX_community_posts_user_created', [
        'publisherType',
        'creatorId',
        'createdAt',
    ]),
    (0, typeorm_1.Index)('IDX_community_posts_company_created', [
        'publisherType',
        'publisherCompanyId',
        'createdAt',
    ]),
    (0, typeorm_1.Index)('IDX_community_posts_media_status_created', [
        'mediaStatus',
        'deletedAt',
        'createdAt',
    ]),
    (0, typeorm_1.Index)('IDX_community_posts_image_asset', ['imageAssetId']),
    (0, typeorm_1.Index)('IDX_community_posts_video_asset', ['videoAssetId']),
    (0, typeorm_1.Index)('IDX_community_posts_video_thumbnail_asset', ['videoThumbnailAssetId'])
], CommunityPost);
//# sourceMappingURL=community-post.entity.js.map