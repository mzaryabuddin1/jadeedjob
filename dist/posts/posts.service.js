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
exports.PostsService = exports.REEL_DURATION_MAX_MS = exports.POST_TEXT_MAX = exports.REEL_TEXT_MAX = void 0;
exports.extractHashtags = extractHashtags;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const post_entity_1 = require("./entities/post.entity");
const post_engagement_entities_1 = require("./entities/post-engagement.entities");
const user_entity_1 = require("../users/entities/user.entity");
const page_entity_1 = require("../pages/entities/page.entity");
const page_member_entity_1 = require("../pages/entities/page-member.entity");
const job_entity_1 = require("../job/entities/job.entity");
const media_service_1 = require("../media/media.service");
const pages_service_1 = require("../pages/pages.service");
const page_permissions_1 = require("../pages/page-permissions");
const job_employer_util_1 = require("../job/job-employer.util");
const follow_service_1 = require("../follow/follow.service");
exports.REEL_TEXT_MAX = 2200;
exports.POST_TEXT_MAX = 3000;
exports.REEL_DURATION_MAX_MS = 180_000;
function extractHashtags(text) {
    if (!text)
        return [];
    const tags = new Set();
    for (const m of text.matchAll(/#([\p{L}\p{N}_]{2,50})/gu)) {
        tags.add(m[1].toLowerCase());
        if (tags.size >= 10)
            break;
    }
    return [...tags];
}
let PostsService = class PostsService {
    constructor(postRepo, hashtagRepo, likeRepo, shareRepo, userRepo, pageRepo, memberRepo, jobRepo, media, pagesService, followService) {
        this.postRepo = postRepo;
        this.hashtagRepo = hashtagRepo;
        this.likeRepo = likeRepo;
        this.shareRepo = shareRepo;
        this.userRepo = userRepo;
        this.pageRepo = pageRepo;
        this.memberRepo = memberRepo;
        this.jobRepo = jobRepo;
        this.media = media;
        this.pagesService = pagesService;
        this.followService = followService;
    }
    async create(userId, dto) {
        const kind = dto.kind;
        const text = dto.text?.trim() || null;
        const mediaIds = [...new Set(dto.mediaIds ?? [])];
        const pageId = dto.pageId ?? null;
        if (pageId) {
            await this.pagesService.requirePermission(pageId, userId, 'posts.manage', 'publish as this page');
        }
        if (kind === 'reel') {
            if (mediaIds.length !== 1) {
                throw new common_1.BadRequestException('A reel needs exactly one video (mediaIds)');
            }
            if (text && text.length > exports.REEL_TEXT_MAX) {
                throw new common_1.BadRequestException(`A reel caption can be at most ${exports.REEL_TEXT_MAX} characters`);
            }
            if (dto.durationMs !== undefined &&
                (dto.durationMs < 1000 || dto.durationMs > exports.REEL_DURATION_MAX_MS)) {
                throw new common_1.BadRequestException(`Reel length must be between 1 and ${exports.REEL_DURATION_MAX_MS / 1000} seconds`);
            }
        }
        else {
            if (!text && !mediaIds.length) {
                throw new common_1.BadRequestException('A post needs some text or media');
            }
            if (text && text.length > exports.POST_TEXT_MAX) {
                throw new common_1.BadRequestException(`A post can be at most ${exports.POST_TEXT_MAX} characters`);
            }
            if (mediaIds.length > 10) {
                throw new common_1.BadRequestException('A post can have at most 10 images (or one video)');
            }
        }
        if (dto.thumbnailMediaId && !mediaIds.length) {
            throw new common_1.BadRequestException('thumbnailMediaId needs a video in mediaIds');
        }
        await this.assertJobTag(userId, pageId, dto.jobId);
        const post = await this.postRepo.manager.transaction(async (m) => {
            const files = await this.media.claim(userId, dto.thumbnailMediaId ? [...mediaIds, dto.thumbnailMediaId] : mediaIds, m);
            const main = files.slice(0, mediaIds.length);
            const thumb = dto.thumbnailMediaId ? files[mediaIds.length] : null;
            const videos = main.filter((f) => f.kind === 'video');
            if (kind === 'reel' && main[0].kind !== 'video') {
                throw new common_1.BadRequestException('A reel must be a video');
            }
            if (videos.length && main.length > 1) {
                throw new common_1.BadRequestException('Send either up to 10 images or a single video');
            }
            if (thumb && (thumb.kind !== 'image' || !videos.length)) {
                throw new common_1.BadRequestException('thumbnailMediaId must be an image for a video');
            }
            const media = main.map((f) => ({
                id: f.id,
                kind: f.kind,
                url: f.url,
                mimeType: f.mimeType,
                size: f.size,
                thumbnailUrl: f.kind === 'video' ? (thumb?.url ?? null) : null,
            }));
            const saved = await m.save(m.create(post_entity_1.Post, {
                kind,
                authorId: userId,
                pageId,
                text,
                media,
                durationMs: kind === 'reel' ? (dto.durationMs ?? null) : null,
                jobId: dto.jobId ?? null,
                visibility: dto.visibility ?? 'public',
            }));
            await this.saveHashtags(m, saved.id, extractHashtags(text));
            return saved;
        });
        return this.getOne(userId, post.id);
    }
    async update(userId, postId, dto) {
        const post = await this.requirePost(postId);
        await this.assertCanManage(post, userId);
        const patch = {};
        if (dto.text !== undefined) {
            const text = dto.text.trim() || null;
            const max = post.kind === 'reel' ? exports.REEL_TEXT_MAX : exports.POST_TEXT_MAX;
            if (text && text.length > max) {
                throw new common_1.BadRequestException(`Text can be at most ${max} characters`);
            }
            if (!text && post.kind === 'post' && !post.media.length) {
                throw new common_1.BadRequestException('A post needs some text or media');
            }
            patch.text = text;
        }
        if (dto.jobId !== undefined) {
            await this.assertJobTag(userId, post.pageId, dto.jobId ?? undefined);
            patch.jobId = dto.jobId ?? null;
        }
        if (dto.visibility !== undefined)
            patch.visibility = dto.visibility;
        if (!Object.keys(patch).length)
            throw new common_1.BadRequestException('Nothing to update');
        await this.postRepo.manager.transaction(async (m) => {
            await m.update(post_entity_1.Post, postId, patch);
            if (patch.text !== undefined) {
                await m.delete(post_engagement_entities_1.PostHashtag, { postId });
                await this.saveHashtags(m, postId, extractHashtags(patch.text));
            }
        });
        return this.getOne(userId, postId);
    }
    async remove(userId, postId) {
        const post = await this.requirePost(postId);
        await this.assertCanManage(post, userId);
        await this.postRepo.update(postId, { deletedAt: new Date() });
        return { message: 'Post deleted' };
    }
    async saveHashtags(m, postId, tags) {
        if (tags.length) {
            await m.insert(post_engagement_entities_1.PostHashtag, tags.map((tag) => ({ postId, tag })));
        }
    }
    async assertJobTag(userId, pageId, jobId) {
        if (!jobId)
            return;
        const job = await this.jobRepo.findOne({
            where: { id: jobId, isActive: true },
            select: ['id', 'createdBy', 'pageId'],
        });
        if (!job)
            throw new common_1.BadRequestException('Job not found or not active');
        if (pageId) {
            if (job.pageId !== pageId) {
                throw new common_1.BadRequestException('A page can only tag its own jobs');
            }
        }
        else if (!(await (0, job_employer_util_1.isJobEmployer)(this.pageRepo, job, userId))) {
            throw new common_1.BadRequestException('You can only tag your own jobs');
        }
    }
    async requirePost(id, viewerId) {
        const post = await this.postRepo.findOne({
            where: { id, deletedAt: (0, typeorm_2.IsNull)() },
        });
        if (!post)
            throw new common_1.NotFoundException('Post not found');
        const author = await this.userRepo.findOne({
            where: { id: post.authorId },
            select: ['id', 'isBanned'],
        });
        if (!author || author.isBanned)
            throw new common_1.NotFoundException('Post not found');
        if (viewerId !== undefined &&
            post.visibility === 'private' &&
            !(await this.canManage(post, viewerId))) {
            throw new common_1.NotFoundException('Post not found');
        }
        return post;
    }
    async canManage(post, userId) {
        if (!post.pageId)
            return post.authorId === userId;
        const page = await this.pagesService.requirePage(post.pageId);
        return (0, page_permissions_1.roleHasPermission)(this.pagesService.roleOf(page, userId), 'posts.manage');
    }
    async assertCanManage(post, userId) {
        if (!(await this.canManage(post, userId))) {
            throw new common_1.ForbiddenException('You cannot change this post');
        }
    }
    async getOne(viewerId, id) {
        const post = await this.requirePost(id, viewerId);
        return (await this.hydrate([post], viewerId))[0];
    }
    async listByUser(viewerId, userId, opts) {
        const user = await this.userRepo.findOne({
            where: { id: userId },
            select: ['id', 'isBanned'],
        });
        if (!user || user.isBanned)
            throw new common_1.NotFoundException('User not found');
        return this.chronological(viewerId, opts, (qb) => qb.andWhere('p.authorId = :userId AND p.pageId IS NULL', { userId }));
    }
    async listByPage(viewerId, pageId, opts) {
        if (!(await this.pageRepo.exist({ where: { id: pageId } }))) {
            throw new common_1.NotFoundException('Page not found');
        }
        return this.chronological(viewerId, opts, (qb) => qb.andWhere('p.pageId = :pageId', { pageId }));
    }
    async feed(viewerId, opts) {
        return this.chronological(viewerId, opts, (qb) => qb
            .andWhere(new typeorm_2.Brackets((b) => b
            .where(`(p.pageId IS NULL AND (p.authorId = :me OR EXISTS (
                 SELECT 1 FROM follows f
                 WHERE f.followerId = :me AND f.targetType = 'user' AND f.targetId = p.authorId)))`)
            .orWhere(`(p.pageId IS NOT NULL AND EXISTS (
                 SELECT 1 FROM follows f
                 WHERE f.followerId = :me AND f.targetType = 'page' AND f.targetId = p.pageId))`)))
            .setParameter('me', viewerId));
    }
    async reelsFeed(viewerId, opts) {
        return this.rankedFeed(viewerId, 'reel', 30, opts);
    }
    async exploreFeed(viewerId, opts) {
        return this.rankedFeed(viewerId, 'post', 90, opts);
    }
    async rankedFeed(viewerId, kind, days, opts) {
        const take = Math.min(30, Math.max(1, Number(opts.limit) || 10));
        const current = Math.max(1, Number(opts.page) || 1);
        const rows = await this.visible(this.postRepo
            .createQueryBuilder('p')
            .where('p.kind = :kind', { kind }), viewerId, true)
            .andWhere('p.createdAt > NOW() - INTERVAL :days DAY', { days })
            .select('p.id', 'id')
            .addSelect(`(p.likesCount + p.commentsCount * 3 + p.sharesCount * 5 + p.viewsCount * 0.2 + 1)
           / POW(TIMESTAMPDIFF(HOUR, p.createdAt, NOW()) + 2, 1.4)`, 'score')
            .orderBy('score', 'DESC')
            .addOrderBy('p.id', 'DESC')
            .offset((current - 1) * take)
            .limit(take + 1)
            .getRawMany();
        const hasMore = rows.length > take;
        const ids = rows.slice(0, take).map((r) => Number(r.id));
        const posts = ids.length
            ? await this.postRepo.find({ where: { id: (0, typeorm_2.In)(ids) } })
            : [];
        const byId = new Map(posts.map((p) => [p.id, p]));
        const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
        return {
            data: await this.hydrate(ordered, viewerId),
            page: current,
            limit: take,
            hasMore,
        };
    }
    async chronological(viewerId, opts, scope) {
        const limit = Math.min(30, Math.max(1, Number(opts.limit) || 10));
        const qb = this.visible(this.postRepo.createQueryBuilder('p').where('1 = 1'), viewerId);
        scope(qb);
        if (opts.kind === 'post' || opts.kind === 'reel') {
            qb.andWhere('p.kind = :kind', { kind: opts.kind });
        }
        if (opts.before)
            qb.andWhere('p.id < :before', { before: opts.before });
        qb.orderBy('p.id', 'DESC').take(limit + 1);
        const rows = await qb.getMany();
        const hasMore = rows.length > limit;
        const page = rows.slice(0, limit);
        return {
            data: await this.hydrate(page, viewerId),
            nextCursor: hasMore ? page[page.length - 1].id : null,
        };
    }
    visible(qb, viewerId, onlyPublic = false) {
        qb.andWhere('p.deletedAt IS NULL').andWhere('NOT EXISTS (SELECT 1 FROM users ub WHERE ub.id = p.authorId AND ub.isBanned = 1)');
        if (onlyPublic) {
            qb.andWhere("p.visibility = 'public'");
        }
        else {
            qb.andWhere(new typeorm_2.Brackets((b) => b
                .where("p.visibility = 'public'")
                .orWhere('p.authorId = :vwr AND p.pageId IS NULL')
                .orWhere(`(p.pageId IS NOT NULL AND (
                 EXISTS (SELECT 1 FROM pages pg WHERE pg.id = p.pageId AND pg.ownerId = :vwr)
                 OR EXISTS (SELECT 1 FROM page_members pm WHERE pm.pageId = p.pageId AND pm.userId = :vwr)))`)));
        }
        return qb.setParameter('vwr', viewerId);
    }
    async search(viewerId, q, opts) {
        const take = Math.min(30, Math.max(1, Number(opts.limit) || 10));
        const current = Math.max(1, Number(opts.page) || 1);
        const word = q.replace(/^#/, '').toLowerCase();
        const safe = word.replace(/[\\%_]/g, '\\$&');
        const qb = this.visible(this.postRepo.createQueryBuilder('p').where('1 = 1'), viewerId, true);
        if (q.startsWith('#')) {
            qb.andWhere('EXISTS (SELECT 1 FROM post_hashtags h WHERE h.postId = p.id AND h.tag = :tag)', { tag: word });
        }
        else {
            qb.andWhere(new typeorm_2.Brackets((b) => b
                .where('p.text LIKE :like', { like: `%${safe}%` })
                .orWhere('EXISTS (SELECT 1 FROM post_hashtags h WHERE h.postId = p.id AND h.tag LIKE :prefix)', { prefix: `${safe}%` })));
        }
        if (opts.kind === 'post' || opts.kind === 'reel') {
            qb.andWhere('p.kind = :kind', { kind: opts.kind });
        }
        const rows = await qb
            .select('p.id', 'id')
            .addSelect(`(p.likesCount + p.commentsCount * 3 + p.sharesCount * 5 + p.viewsCount * 0.2 + 1)
           / POW(TIMESTAMPDIFF(HOUR, p.createdAt, NOW()) + 2, 1.2)`, 'score')
            .orderBy('score', 'DESC')
            .addOrderBy('p.id', 'DESC')
            .offset((current - 1) * take)
            .limit(take + 1)
            .getRawMany();
        const hasMore = rows.length > take;
        const ids = rows.slice(0, take).map((r) => Number(r.id));
        const posts = ids.length
            ? await this.postRepo.find({ where: { id: (0, typeorm_2.In)(ids) } })
            : [];
        const byId = new Map(posts.map((p) => [p.id, p]));
        return {
            data: await this.hydrate(ids.map((id) => byId.get(id)).filter(Boolean), viewerId),
            page: current,
            limit: take,
            hasMore,
        };
    }
    async hashtagSearch(prefix, limit = 10) {
        const safe = prefix
            .replace(/^#/, '')
            .toLowerCase()
            .replace(/[\\%_]/g, '\\$&');
        const rows = await this.hashtagRepo
            .createQueryBuilder('h')
            .innerJoin(post_entity_1.Post, 'p', "p.id = h.postId AND p.deletedAt IS NULL AND p.visibility = 'public'")
            .select('h.tag', 'tag')
            .addSelect('COUNT(*)', 'posts')
            .where('h.tag LIKE :prefix', { prefix: `${safe}%` })
            .groupBy('h.tag')
            .orderBy('posts', 'DESC')
            .addOrderBy('h.tag', 'ASC')
            .limit(Math.min(30, Math.max(1, limit)))
            .getRawMany();
        return rows.map((r) => ({ tag: r.tag, posts: Number(r.posts) }));
    }
    async trendingHashtags(days = 3, limit = 10) {
        const rows = await this.hashtagRepo
            .createQueryBuilder('h')
            .innerJoin(post_entity_1.Post, 'p', "p.id = h.postId AND p.deletedAt IS NULL AND p.visibility = 'public'")
            .select('h.tag', 'tag')
            .addSelect('COUNT(*)', 'posts')
            .where('p.createdAt > NOW() - INTERVAL :days DAY', {
            days: Math.max(1, days),
        })
            .groupBy('h.tag')
            .orderBy('posts', 'DESC')
            .addOrderBy('h.tag', 'ASC')
            .limit(Math.min(30, Math.max(1, limit)))
            .getRawMany();
        return rows.map((r) => ({ tag: r.tag, posts: Number(r.posts) }));
    }
    async hydrate(posts, viewerId) {
        if (!posts.length)
            return [];
        const ids = posts.map((p) => p.id);
        const authorIds = posts.map((p) => p.authorId);
        const pageIds = posts.map((p) => p.pageId).filter(Boolean);
        const jobIds = posts.map((p) => p.jobId).filter(Boolean);
        const [authors, pages, jobs, myLikes, myShares, followedUsers, followedPages, roles,] = await Promise.all([
            this.followService.usersById(authorIds),
            this.followService.pagesById(pageIds),
            this.jobsById(jobIds),
            this.likeRepo.find({
                where: { userId: viewerId, postId: (0, typeorm_2.In)(ids) },
                select: ['postId'],
            }),
            this.shareRepo.find({
                where: { userId: viewerId, postId: (0, typeorm_2.In)(ids) },
                select: ['postId'],
            }),
            this.followService.followedSet(viewerId, 'user', authorIds),
            this.followService.followedSet(viewerId, 'page', pageIds),
            this.pageRoles(pageIds, viewerId),
        ]);
        const liked = new Set(myLikes.map((l) => l.postId));
        const shared = new Set(myShares.map((s) => s.postId));
        const tags = await this.hashtagRepo.find({ where: { postId: (0, typeorm_2.In)(ids) } });
        const tagsByPost = new Map();
        for (const t of tags) {
            tagsByPost.set(t.postId, [...(tagsByPost.get(t.postId) ?? []), t.tag]);
        }
        return posts.map((p) => {
            const author = authors.get(p.authorId);
            const page = p.pageId ? pages.get(p.pageId) : null;
            const job = p.jobId ? jobs.get(p.jobId) : null;
            return {
                id: p.id,
                kind: p.kind,
                publishedAs: p.pageId ? 'page' : 'user',
                visibility: p.visibility,
                text: p.text,
                media: p.media,
                durationMs: p.durationMs,
                hashtags: tagsByPost.get(p.id) ?? [],
                author: author
                    ? {
                        id: author.id,
                        name: (0, follow_service_1.fullName)(author),
                        username: author.username,
                        profile_photo: author.profile_photo,
                        headline: author.headline,
                        isFollowing: followedUsers.has(author.id),
                        isMe: author.id === viewerId,
                    }
                    : null,
                page: page
                    ? {
                        id: page.id,
                        page_name: page.page_name,
                        username: page.username,
                        page_logo: page.page_logo,
                        is_verified: !!page.is_verified,
                        isFollowing: followedPages.has(page.id),
                    }
                    : null,
                job: job ?? null,
                counts: {
                    likes: p.likesCount,
                    comments: p.commentsCount,
                    shares: p.sharesCount,
                    views: p.viewsCount,
                },
                viewer: {
                    liked: liked.has(p.id),
                    shared: shared.has(p.id),
                    canManage: p.pageId
                        ? (0, page_permissions_1.roleHasPermission)(roles.get(p.pageId), 'posts.manage')
                        : p.authorId === viewerId,
                },
                createdAt: p.createdAt,
            };
        });
    }
    async jobsById(ids) {
        const unique = [...new Set(ids)];
        if (!unique.length)
            return new Map();
        const jobs = await this.jobRepo
            .createQueryBuilder('j')
            .select([
            'j.id',
            'j.title',
            'j.salaryType',
            'j.salaryAmount',
            'j.currency',
            'j.isRemote',
            'j.isActive',
            'j.pageId',
        ])
            .whereInIds(unique)
            .getMany();
        return new Map(jobs.map((j) => [
            j.id,
            {
                id: j.id,
                title: j.title,
                salaryType: j.salaryType,
                salaryAmount: j.salaryAmount,
                currency: j.currency,
                isRemote: j.isRemote,
                isActive: j.isActive,
            },
        ]));
    }
    async pageRoles(pageIds, userId) {
        const roles = new Map();
        const unique = [...new Set(pageIds)];
        if (!unique.length)
            return roles;
        const owned = await this.pageRepo.find({
            where: { id: (0, typeorm_2.In)(unique), ownerId: userId },
            select: ['id'],
        });
        for (const p of owned)
            roles.set(p.id, 'owner');
        const members = await this.memberRepo.find({
            where: { userId, pageId: (0, typeorm_2.In)(unique) },
        });
        for (const m of members)
            if (!roles.has(m.pageId))
                roles.set(m.pageId, m.role);
        return roles;
    }
};
exports.PostsService = PostsService;
exports.PostsService = PostsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(post_entity_1.Post)),
    __param(1, (0, typeorm_1.InjectRepository)(post_engagement_entities_1.PostHashtag)),
    __param(2, (0, typeorm_1.InjectRepository)(post_engagement_entities_1.PostLike)),
    __param(3, (0, typeorm_1.InjectRepository)(post_engagement_entities_1.PostShare)),
    __param(4, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(5, (0, typeorm_1.InjectRepository)(page_entity_1.Page)),
    __param(6, (0, typeorm_1.InjectRepository)(page_member_entity_1.PageMember)),
    __param(7, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        media_service_1.MediaService,
        pages_service_1.PagesService,
        follow_service_1.FollowService])
], PostsService);
//# sourceMappingURL=posts.service.js.map