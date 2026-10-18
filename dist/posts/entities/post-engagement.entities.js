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
exports.PostHashtag = exports.PostStatsDaily = exports.PostViewer = exports.PostShare = exports.PostComment = exports.PostLike = void 0;
const typeorm_1 = require("typeorm");
const post_entity_1 = require("./post.entity");
const user_entity_1 = require("../../users/entities/user.entity");
const bigint = {
    to: (v) => v,
    from: (v) => (v == null ? 0 : Number(v)),
};
let PostLike = class PostLike {
};
exports.PostLike = PostLike;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], PostLike.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], PostLike.prototype, "postId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => post_entity_1.Post, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'postId' }),
    __metadata("design:type", post_entity_1.Post)
], PostLike.prototype, "post", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], PostLike.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", user_entity_1.User)
], PostLike.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PostLike.prototype, "createdAt", void 0);
exports.PostLike = PostLike = __decorate([
    (0, typeorm_1.Entity)('post_likes'),
    (0, typeorm_1.Unique)('UQ_post_like', ['postId', 'userId']),
    (0, typeorm_1.Index)('IDX_post_like_user', ['userId'])
], PostLike);
let PostComment = class PostComment {
};
exports.PostComment = PostComment;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], PostComment.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], PostComment.prototype, "postId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => post_entity_1.Post, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'postId' }),
    __metadata("design:type", post_entity_1.Post)
], PostComment.prototype, "post", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], PostComment.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", user_entity_1.User)
], PostComment.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], PostComment.prototype, "parentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 1000 }),
    __metadata("design:type", String)
], PostComment.prototype, "text", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], PostComment.prototype, "repliesCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], PostComment.prototype, "deletedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PostComment.prototype, "createdAt", void 0);
exports.PostComment = PostComment = __decorate([
    (0, typeorm_1.Entity)('post_comments'),
    (0, typeorm_1.Index)('IDX_post_comment_thread', ['postId', 'parentId', 'id'])
], PostComment);
let PostShare = class PostShare {
};
exports.PostShare = PostShare;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], PostShare.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], PostShare.prototype, "postId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => post_entity_1.Post, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'postId' }),
    __metadata("design:type", post_entity_1.Post)
], PostShare.prototype, "post", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], PostShare.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", user_entity_1.User)
], PostShare.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, default: 'link' }),
    __metadata("design:type", String)
], PostShare.prototype, "channel", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PostShare.prototype, "createdAt", void 0);
exports.PostShare = PostShare = __decorate([
    (0, typeorm_1.Entity)('post_shares'),
    (0, typeorm_1.Unique)('UQ_post_share', ['postId', 'userId'])
], PostShare);
let PostViewer = class PostViewer {
};
exports.PostViewer = PostViewer;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", Number)
], PostViewer.prototype, "postId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => post_entity_1.Post, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'postId' }),
    __metadata("design:type", post_entity_1.Post)
], PostViewer.prototype, "post", void 0);
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", Number)
], PostViewer.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", user_entity_1.User)
], PostViewer.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], PostViewer.prototype, "firstSeenAt", void 0);
exports.PostViewer = PostViewer = __decorate([
    (0, typeorm_1.Entity)('post_viewers')
], PostViewer);
let PostStatsDaily = class PostStatsDaily {
};
exports.PostStatsDaily = PostStatsDaily;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", Number)
], PostStatsDaily.prototype, "postId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => post_entity_1.Post, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'postId' }),
    __metadata("design:type", post_entity_1.Post)
], PostStatsDaily.prototype, "post", void 0);
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'date' }),
    __metadata("design:type", String)
], PostStatsDaily.prototype, "day", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], PostStatsDaily.prototype, "impressions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], PostStatsDaily.prototype, "views", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], PostStatsDaily.prototype, "newViewers", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', default: 0, transformer: bigint }),
    __metadata("design:type", Number)
], PostStatsDaily.prototype, "watchTimeMs", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], PostStatsDaily.prototype, "completions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], PostStatsDaily.prototype, "likes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], PostStatsDaily.prototype, "comments", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], PostStatsDaily.prototype, "shares", void 0);
exports.PostStatsDaily = PostStatsDaily = __decorate([
    (0, typeorm_1.Entity)('post_stats_daily')
], PostStatsDaily);
let PostHashtag = class PostHashtag {
};
exports.PostHashtag = PostHashtag;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", Number)
], PostHashtag.prototype, "postId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => post_entity_1.Post, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'postId' }),
    __metadata("design:type", post_entity_1.Post)
], PostHashtag.prototype, "post", void 0);
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], PostHashtag.prototype, "tag", void 0);
exports.PostHashtag = PostHashtag = __decorate([
    (0, typeorm_1.Entity)('post_hashtags'),
    (0, typeorm_1.Index)('IDX_post_hashtag_tag', ['tag', 'postId'])
], PostHashtag);
//# sourceMappingURL=post-engagement.entities.js.map