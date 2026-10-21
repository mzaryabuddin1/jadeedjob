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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostEngagementService = exports.SHARE_CHANNELS = exports.COMMENT_MAX = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const post_entity_1 = require("./entities/post.entity");
const post_engagement_entities_1 = require("./entities/post-engagement.entities");
const posts_service_1 = require("./posts.service");
const post_stats_service_1 = require("./post-stats.service");
const post_engagement_notifier_1 = require("./post-engagement-notifier");
const follow_service_1 = require("../follow/follow.service");
exports.COMMENT_MAX = 1000;
exports.SHARE_CHANNELS = ['link', 'chat', 'external'];
let PostEngagementService = class PostEngagementService {
    constructor(postRepo, likeRepo, commentRepo, shareRepo, posts, stats, notifier, followService) {
        this.postRepo = postRepo;
        this.likeRepo = likeRepo;
        this.commentRepo = commentRepo;
        this.shareRepo = shareRepo;
        this.posts = posts;
        this.stats = stats;
        this.notifier = notifier;
        this.followService = followService;
    }
    async counts(postId) {
        return this.postRepo.findOneOrFail({
            where: { id: postId },
            select: ['id', 'likesCount', 'commentsCount', 'sharesCount'],
        });
    }
    async like(userId, postId) {
        const post = await this.posts.requirePost(postId, userId);
        const created = await this.likeRepo.manager.transaction(async (m) => {
            const res = await m
                .createQueryBuilder()
                .insert()
                .into(post_engagement_entities_1.PostLike)
                .values({ postId, userId })
                .orIgnore()
                .updateEntity(false)
                .execute();
            if (!((res.raw?.affectedRows ?? 0) > 0))
                return false;
            await m.increment(post_entity_1.Post, { id: postId }, 'likesCount', 1);
            return true;
        });
        if (created) {
            await this.stats.bump(postId, { likes: 1 });
            void this.notifier.onLike(post, userId);
        }
        return {
            liked: true,
            created,
            likesCount: (await this.counts(postId)).likesCount,
        };
    }
    async unlike(userId, postId) {
        await this.posts.requirePost(postId, userId);
        const removed = await this.likeRepo.manager.transaction(async (m) => {
            const res = await m.delete(post_engagement_entities_1.PostLike, { postId, userId });
            if (!res.affected)
                return false;
            await m
                .createQueryBuilder()
                .update(post_entity_1.Post)
                .set({ likesCount: () => 'GREATEST(likesCount - 1, 0)' })
                .where('id = :postId', { postId })
                .execute();
            return true;
        });
        return {
            liked: false,
            removed,
            likesCount: (await this.counts(postId)).likesCount,
        };
    }
    async listLikes(postId, viewerId, opts) {
        await this.posts.requirePost(postId, viewerId);
        const limit = Math.min(50, Math.max(1, Number(opts.limit) || 20));
        const qb = this.likeRepo
            .createQueryBuilder('l')
            .where('l.postId = :postId', { postId })
            .orderBy('l.id', 'DESC')
            .take(limit + 1);
        if (opts.before)
            qb.andWhere('l.id < :before', { before: opts.before });
        const rows = await qb.getMany();
        const hasMore = rows.length > limit;
        const page = rows.slice(0, limit);
        const users = await this.followService.usersById(page.map((r) => r.userId));
        const followed = await this.followService.followedSet(viewerId, 'user', page.map((r) => r.userId));
        return {
            total: (await this.counts(postId)).likesCount,
            data: page
                .map((r) => users.get(r.userId))
                .filter(Boolean)
                .map((u) => this.followService.toPerson(u, viewerId, followed)),
            nextCursor: hasMore ? page[page.length - 1].id : null,
        };
    }
    async comment(userId, postId, text, parentId) {
        const post = await this.posts.requirePost(postId, userId);
        const body = text.trim();
        if (!body)
            throw new common_1.BadRequestException('Comment cannot be empty');
        if (body.length > exports.COMMENT_MAX) {
            throw new common_1.BadRequestException(`Comment can be at most ${exports.COMMENT_MAX} characters`);
        }
        let parent = null;
        if (parentId) {
            parent = await this.commentRepo.findOne({
                where: { id: parentId, postId, deletedAt: (0, typeorm_2.IsNull)() },
            });
            if (parent?.parentId) {
                parent = await this.commentRepo.findOne({
                    where: { id: parent.parentId, postId, deletedAt: (0, typeorm_2.IsNull)() },
                });
            }
            if (!parent)
                throw new common_1.NotFoundException('Comment not found');
        }
        const saved = await this.commentRepo.manager.transaction(async (m) => {
            const c = await m.save(m.create(post_engagement_entities_1.PostComment, {
                postId,
                userId,
                parentId: parent?.id ?? null,
                text: body,
            }));
            await m.increment(post_entity_1.Post, { id: postId }, 'commentsCount', 1);
            if (parent)
                await m.increment(post_engagement_entities_1.PostComment, { id: parent.id }, 'repliesCount', 1);
            return c;
        });
        await this.stats.bump(postId, { comments: 1 });
        void this.notifier.onComment(post, userId, saved, parent);
        return (await this.commentViews([saved], post, userId))[0];
    }
    async listComments(postId, viewerId, opts) {
        const post = await this.posts.requirePost(postId, viewerId);
        const limit = Math.min(50, Math.max(1, Number(opts.limit) || 20));
        const qb = this.visibleComments(postId)
            .andWhere('c.parentId IS NULL')
            .orderBy('c.id', 'DESC')
            .take(limit + 1);
        if (opts.before)
            qb.andWhere('c.id < :before', { before: opts.before });
        const rows = await qb.getMany();
        const hasMore = rows.length > limit;
        const page = rows.slice(0, limit);
        return {
            total: post.commentsCount,
            data: await this.commentViews(page, post, viewerId),
            nextCursor: hasMore ? page[page.length - 1].id : null,
        };
    }
    async listReplies(commentId, viewerId, opts) {
        const top = await this.commentRepo.findOne({
            where: { id: commentId, deletedAt: (0, typeorm_2.IsNull)() },
        });
        if (!top)
            throw new common_1.NotFoundException('Comment not found');
        const post = await this.posts.requirePost(top.postId, viewerId);
        const limit = Math.min(50, Math.max(1, Number(opts.limit) || 20));
        const qb = this.visibleComments(top.postId)
            .andWhere('c.parentId = :commentId', { commentId })
            .orderBy('c.id', 'ASC')
            .take(limit + 1);
        if (opts.after)
            qb.andWhere('c.id > :after', { after: opts.after });
        const rows = await qb.getMany();
        const hasMore = rows.length > limit;
        const page = rows.slice(0, limit);
        return {
            data: await this.commentViews(page, post, viewerId),
            nextCursor: hasMore ? page[page.length - 1].id : null,
        };
    }
    async deleteComment(userId, commentId) {
        const comment = await this.commentRepo.findOne({
            where: { id: commentId, deletedAt: (0, typeorm_2.IsNull)() },
        });
        if (!comment)
            throw new common_1.NotFoundException('Comment not found');
        const post = await this.posts.requirePost(comment.postId);
        if (comment.userId !== userId &&
            !(await this.posts.canManage(post, userId))) {
            throw new common_1.ForbiddenException('You cannot delete this comment');
        }
        const removed = await this.commentRepo.manager.transaction(async (m) => {
            const res = await m
                .createQueryBuilder()
                .update(post_engagement_entities_1.PostComment)
                .set({ deletedAt: new Date() })
                .where('deletedAt IS NULL AND (id = :id OR parentId = :id)', {
                id: commentId,
            })
                .execute();
            const n = res.affected ?? 0;
            await m
                .createQueryBuilder()
                .update(post_entity_1.Post)
                .set({
                commentsCount: () => `GREATEST(commentsCount - ${Number(n)}, 0)`,
            })
                .where('id = :id', { id: post.id })
                .execute();
            if (comment.parentId) {
                await m
                    .createQueryBuilder()
                    .update(post_engagement_entities_1.PostComment)
                    .set({ repliesCount: () => 'GREATEST(repliesCount - 1, 0)' })
                    .where('id = :id', { id: comment.parentId })
                    .execute();
            }
            return n;
        });
        return { message: 'Comment deleted', removed };
    }
    visibleComments(postId) {
        return this.commentRepo
            .createQueryBuilder('c')
            .where('c.postId = :postId AND c.deletedAt IS NULL', { postId })
            .andWhere('NOT EXISTS (SELECT 1 FROM users ub WHERE ub.id = c.userId AND ub.isBanned = 1)');
    }
    async commentViews(rows, post, viewerId) {
        const users = await this.followService.usersById(rows.map((r) => r.userId));
        const manager = await this.posts.canManage(post, viewerId);
        return rows.map((c) => {
            const u = users.get(c.userId);
            return {
                id: c.id,
                postId: c.postId,
                parentId: c.parentId,
                text: c.text,
                repliesCount: c.repliesCount,
                createdAt: c.createdAt,
                user: u
                    ? {
                        id: u.id,
                        name: (0, follow_service_1.fullName)(u),
                        username: u.username,
                        profile_photo: u.profile_photo,
                    }
                    : null,
                canDelete: c.userId === viewerId || manager,
            };
        });
    }
    shareUrl(postId) {
        const template = process.env.APP_SHARE_URL ||
            `${process.env.APP_URL || 'http://localhost:3000'}/p/{id}`;
        return template.replace('{id}', String(postId));
    }
    async share(userId, postId, channel) {
        await this.posts.requirePost(postId, userId);
        const via = exports.SHARE_CHANNELS.includes(channel)
            ? channel
            : 'link';
        const created = await this.shareRepo.manager.transaction(async (m) => {
            const res = await m
                .createQueryBuilder()
                .insert()
                .into(post_engagement_entities_1.PostShare)
                .values({ postId, userId, channel: via })
                .orIgnore()
                .updateEntity(false)
                .execute();
            if (!((res.raw?.affectedRows ?? 0) > 0))
                return false;
            await m.increment(post_entity_1.Post, { id: postId }, 'sharesCount', 1);
            return true;
        });
        if (created)
            await this.stats.bump(postId, { shares: 1 });
        return {
            shared: true,
            created,
            sharesCount: (await this.counts(postId)).sharesCount,
            shareUrl: this.shareUrl(postId),
        };
    }
    async shareLink(postId, viewerId) {
        await this.posts.requirePost(postId, viewerId);
        return { shareUrl: this.shareUrl(postId) };
    }
};
exports.PostEngagementService = PostEngagementService;
exports.PostEngagementService = PostEngagementService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(post_entity_1.Post)),
    __param(1, (0, typeorm_1.InjectRepository)(post_engagement_entities_1.PostLike)),
    __param(2, (0, typeorm_1.InjectRepository)(post_engagement_entities_1.PostComment)),
    __param(3, (0, typeorm_1.InjectRepository)(post_engagement_entities_1.PostShare)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        posts_service_1.PostsService,
        post_stats_service_1.PostStatsService,
        post_engagement_notifier_1.PostEngagementNotifier,
        follow_service_1.FollowService])
], PostEngagementService);
//# sourceMappingURL=post-engagement.service.js.map