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
exports.PostVideoUploadSession = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const community_post_entity_1 = require("./community-post.entity");
let PostVideoUploadSession = class PostVideoUploadSession {
};
exports.PostVideoUploadSession = PostVideoUploadSession;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], PostVideoUploadSession.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PostVideoUploadSession.prototype, "uploadId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], PostVideoUploadSession.prototype, "postId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => community_post_entity_1.CommunityPost, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({
        name: 'postId',
        foreignKeyConstraintName: 'FK_post_video_upload_post',
    }),
    __metadata("design:type", community_post_entity_1.CommunityPost)
], PostVideoUploadSession.prototype, "post", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], PostVideoUploadSession.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({
        name: 'userId',
        foreignKeyConstraintName: 'FK_post_video_upload_user',
    }),
    __metadata("design:type", user_entity_1.User)
], PostVideoUploadSession.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], PostVideoUploadSession.prototype, "replacement", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['pending', 'uploaded', 'completed', 'expired', 'failed'],
        default: 'pending',
    }),
    __metadata("design:type", String)
], PostVideoUploadSession.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 500 }),
    __metadata("design:type", String)
], PostVideoUploadSession.prototype, "uploadKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], PostVideoUploadSession.prototype, "originalFileName", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], PostVideoUploadSession.prototype, "contentType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', unsigned: true, nullable: true }),
    __metadata("design:type", Number)
], PostVideoUploadSession.prototype, "expectedFileSizeBytes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', unsigned: true, nullable: true }),
    __metadata("design:type", Number)
], PostVideoUploadSession.prototype, "clientDurationSeconds", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 255 }),
    __metadata("design:type", String)
], PostVideoUploadSession.prototype, "uploadedFileName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 2000 }),
    __metadata("design:type", String)
], PostVideoUploadSession.prototype, "localFilePath", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 2000 }),
    __metadata("design:type", String)
], PostVideoUploadSession.prototype, "publicUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        length: 36,
        charset: 'ascii',
        collation: 'ascii_bin',
    }),
    __metadata("design:type", String)
], PostVideoUploadSession.prototype, "uploadedAssetId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        nullable: true,
        length: 36,
        charset: 'ascii',
        collation: 'ascii_bin',
    }),
    __metadata("design:type", String)
], PostVideoUploadSession.prototype, "thumbnailAssetId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', unsigned: true, nullable: true }),
    __metadata("design:type", Number)
], PostVideoUploadSession.prototype, "uploadedFileSizeBytes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', unsigned: true, nullable: true }),
    __metadata("design:type", Number)
], PostVideoUploadSession.prototype, "uploadedDurationSeconds", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 100 }),
    __metadata("design:type", String)
], PostVideoUploadSession.prototype, "uploadedContentType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], PostVideoUploadSession.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], PostVideoUploadSession.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], PostVideoUploadSession.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PostVideoUploadSession.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], PostVideoUploadSession.prototype, "updatedAt", void 0);
exports.PostVideoUploadSession = PostVideoUploadSession = __decorate([
    (0, typeorm_1.Entity)('community_post_video_upload_sessions'),
    (0, typeorm_1.Index)('IDX_post_video_upload_id', ['uploadId'], { unique: true }),
    (0, typeorm_1.Index)('IDX_post_video_upload_post_user', ['postId', 'userId']),
    (0, typeorm_1.Index)('IDX_post_video_upload_uploaded_asset', ['uploadedAssetId']),
    (0, typeorm_1.Index)('IDX_post_video_upload_thumbnail_asset', ['thumbnailAssetId'])
], PostVideoUploadSession);
//# sourceMappingURL=post-video-upload-session.entity.js.map