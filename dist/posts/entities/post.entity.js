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
exports.Post = void 0;
exports.countContent = countContent;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const page_entity_1 = require("../../pages/entities/page.entity");
const job_entity_1 = require("../../job/entities/job.entity");
const bigint = {
    to: (v) => v,
    from: (v) => (v == null ? 0 : Number(v)),
};
let Post = class Post {
};
exports.Post = Post;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Post.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 4 }),
    __metadata("design:type", String)
], Post.prototype, "kind", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], Post.prototype, "authorId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'authorId' }),
    __metadata("design:type", user_entity_1.User)
], Post.prototype, "author", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], Post.prototype, "pageId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => page_entity_1.Page, { nullable: true, onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'pageId' }),
    __metadata("design:type", page_entity_1.Page)
], Post.prototype, "page", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Post.prototype, "text", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json' }),
    __metadata("design:type", Array)
], Post.prototype, "media", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], Post.prototype, "durationMs", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], Post.prototype, "jobId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => job_entity_1.Job, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'jobId' }),
    __metadata("design:type", job_entity_1.Job)
], Post.prototype, "job", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Post.prototype, "likesCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Post.prototype, "commentsCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Post.prototype, "sharesCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Post.prototype, "viewsCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Post.prototype, "impressionsCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Post.prototype, "reachCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', default: 0, transformer: bigint }),
    __metadata("design:type", Number)
], Post.prototype, "watchTimeMs", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Post.prototype, "completionsCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], Post.prototype, "deletedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Post.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Post.prototype, "updatedAt", void 0);
exports.Post = Post = __decorate([
    (0, typeorm_1.Entity)('posts'),
    (0, typeorm_1.Index)('IDX_post_kind_time', ['kind', 'deletedAt', 'id']),
    (0, typeorm_1.Index)('IDX_post_author', ['authorId', 'id']),
    (0, typeorm_1.Index)('IDX_post_page', ['pageId', 'id'])
], Post);
async function countContent(repo, where) {
    const qb = repo
        .createQueryBuilder('p')
        .select('p.kind', 'kind')
        .addSelect('COUNT(*)', 'n')
        .where('p.deletedAt IS NULL');
    if ('userId' in where) {
        qb.andWhere('p.authorId = :id AND p.pageId IS NULL', { id: where.userId });
    }
    else {
        qb.andWhere('p.pageId = :id', { id: where.pageId });
    }
    const rows = await qb.groupBy('p.kind').getRawMany();
    const n = (k) => Number(rows.find((r) => r.kind === k)?.n ?? 0);
    return { posts: n('post'), reels: n('reel') };
}
//# sourceMappingURL=post.entity.js.map