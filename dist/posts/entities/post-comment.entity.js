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
exports.PostComment = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const community_post_entity_1 = require("./community-post.entity");
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
    (0, typeorm_1.ManyToOne)(() => community_post_entity_1.CommunityPost, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({
        name: 'postId',
        foreignKeyConstraintName: 'FK_community_post_comments_post',
    }),
    __metadata("design:type", community_post_entity_1.CommunityPost)
], PostComment.prototype, "post", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], PostComment.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { eager: true, onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({
        name: 'userId',
        foreignKeyConstraintName: 'FK_community_post_comments_user',
    }),
    __metadata("design:type", user_entity_1.User)
], PostComment.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], PostComment.prototype, "text", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['visible', 'hidden', 'removed'],
        default: 'visible',
    }),
    __metadata("design:type", String)
], PostComment.prototype, "moderationStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], PostComment.prototype, "deletedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], PostComment.prototype, "deletedByUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 80 }),
    __metadata("design:type", String)
], PostComment.prototype, "deletionReason", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PostComment.prototype, "createdAt", void 0);
exports.PostComment = PostComment = __decorate([
    (0, typeorm_1.Entity)('community_post_comments'),
    (0, typeorm_1.Index)('IDX_community_post_comments_post_created', ['postId', 'createdAt'])
], PostComment);
//# sourceMappingURL=post-comment.entity.js.map