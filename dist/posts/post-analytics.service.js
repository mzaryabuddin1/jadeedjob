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
exports.PostAnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const post_entity_1 = require("./entities/post.entity");
const post_engagement_entities_1 = require("./entities/post-engagement.entities");
const posts_service_1 = require("./posts.service");
const post_stats_service_1 = require("./post-stats.service");
const follow_entity_1 = require("../follow/follow.entity");
const user_entity_1 = require("../users/entities/user.entity");
const page_entity_1 = require("../pages/entities/page.entity");
const pages_service_1 = require("../pages/pages.service");
const page_permissions_1 = require("../pages/page-permissions");
const MAX_WATCH_MS = 10 * 60 * 1000;
const dayString = (d) => d.toISOString().slice(0, 10);
let PostAnalyticsService = class PostAnalyticsService {
    constructor(postRepo, statsRepo, followRepo, userRepo, pageRepo, posts, stats, pagesService) {
        this.postRepo = postRepo;
        this.statsRepo = statsRepo;
        this.followRepo = followRepo;
        this.userRepo = userRepo;
        this.pageRepo = pageRepo;
        this.posts = posts;
        this.stats = stats;
        this.pagesService = pagesService;
    }
    async record(viewerId, events) {
        const ids = [...new Set(events.map((e) => e.postId))];
        const found = ids.length
            ? await this.postRepo.find({
                where: { id: (0, typeorm_2.In)(ids), deletedAt: (0, typeorm_2.IsNull)() },
                select: ['id', 'authorId', 'durationMs'],
            })
            : [];
        const byId = new Map(found.map((p) => [p.id, p]));
        const acc = new Map();
        let ignored = 0;
        for (const e of events) {
            const post = byId.get(e.postId);
            if (!post || post.authorId === viewerId) {
                ignored++;
                continue;
            }
            const a = acc.get(post.id) ?? {
                impressions: 0,
                views: 0,
                watch: 0,
                completions: 0,
            };
            if (e.type === 'impression') {
                a.impressions++;
            }
            else {
                a.views++;
                const cap = Math.min(MAX_WATCH_MS, (post.durationMs ?? MAX_WATCH_MS) * 3);
                a.watch += Math.max(0, Math.min(Number(e.watchMs) || 0, cap));
                if (e.completed)
                    a.completions++;
            }
            acc.set(post.id, a);
        }
        for (const [postId, a] of acc) {
            let newViewer = false;
            if (a.views > 0) {
                const res = await this.postRepo.manager
                    .createQueryBuilder()
                    .insert()
                    .into(post_engagement_entities_1.PostViewer)
                    .values({ postId, userId: viewerId, firstSeenAt: new Date() })
                    .orIgnore()
                    .updateEntity(false)
                    .execute();
                newViewer = (res.raw?.affectedRows ?? 0) > 0;
            }
            await this.postRepo
                .createQueryBuilder()
                .update(post_entity_1.Post)
                .set({
                impressionsCount: () => `impressionsCount + ${a.impressions}`,
                viewsCount: () => `viewsCount + ${a.views}`,
                watchTimeMs: () => `watchTimeMs + ${a.watch}`,
                completionsCount: () => `completionsCount + ${a.completions}`,
                reachCount: () => `reachCount + ${newViewer ? 1 : 0}`,
            })
                .where('id = :postId', { postId })
                .execute();
            await this.stats.bump(postId, {
                impressions: a.impressions,
                views: a.views,
                newViewers: newViewer ? 1 : 0,
                watchTimeMs: a.watch,
                completions: a.completions,
            });
        }
        return { accepted: events.length - ignored, ignored };
    }
    async assertCanSee(post, userId) {
        if (post.pageId) {
            const page = await this.pagesService.requirePage(post.pageId);
            if (!(0, page_permissions_1.roleHasPermission)(this.pagesService.roleOf(page, userId), 'analytics.view')) {
                throw new common_1.ForbiddenException('Only the page owner or admins can see analytics');
            }
        }
        else if (post.authorId !== userId) {
            throw new common_1.ForbiddenException('Only the author can see analytics');
        }
    }
    period(days) {
        const n = Math.min(90, Math.max(1, Number(days) || 7));
        const to = new Date();
        const from = new Date(to.getTime() - (n - 1) * 86_400_000);
        const list = [];
        for (let i = 0; i < n; i++) {
            list.push(dayString(new Date(from.getTime() + i * 86_400_000)));
        }
        return { days: n, from: list[0], to: list[list.length - 1], list };
    }
    async postAnalytics(userId, postId, days) {
        const post = await this.posts.requirePost(postId);
        await this.assertCanSee(post, userId);
        const p = this.period(days);
        const rows = await this.statsRepo
            .createQueryBuilder('s')
            .select("DATE_FORMAT(s.day, '%Y-%m-%d')", 'day')
            .addSelect('s.impressions', 'impressions')
            .addSelect('s.views', 'views')
            .addSelect('s.newViewers', 'newViewers')
            .addSelect('s.watchTimeMs', 'watchTimeMs')
            .addSelect('s.completions', 'completions')
            .addSelect('s.likes', 'likes')
            .addSelect('s.comments', 'comments')
            .addSelect('s.shares', 'shares')
            .where('s.postId = :postId AND s.day >= :from', { postId, from: p.from })
            .getRawMany();
        const byDay = new Map(rows.map((r) => [r.day, r]));
        const daily = p.list.map((day) => {
            const r = byDay.get(day);
            return {
                day,
                impressions: Number(r?.impressions ?? 0),
                views: Number(r?.views ?? 0),
                newViewers: Number(r?.newViewers ?? 0),
                watchTimeMs: Number(r?.watchTimeMs ?? 0),
                completions: Number(r?.completions ?? 0),
                likes: Number(r?.likes ?? 0),
                comments: Number(r?.comments ?? 0),
                shares: Number(r?.shares ?? 0),
            };
        });
        const totals = this.sum(daily);
        return {
            post: {
                id: post.id,
                kind: post.kind,
                text: post.text,
                thumbnail: post.media[0]?.thumbnailUrl ?? post.media[0]?.url ?? null,
                createdAt: post.createdAt,
            },
            period: { days: p.days, from: p.from, to: p.to },
            totals,
            rates: this.rates(totals),
            lifetime: {
                impressions: post.impressionsCount,
                views: post.viewsCount,
                reach: post.reachCount,
                likes: post.likesCount,
                comments: post.commentsCount,
                shares: post.sharesCount,
                watchTimeMs: post.watchTimeMs,
                completions: post.completionsCount,
            },
            daily,
        };
    }
    sum(rows) {
        const t = {
            impressions: 0,
            views: 0,
            newViewers: 0,
            watchTimeMs: 0,
            completions: 0,
            likes: 0,
            comments: 0,
            shares: 0,
        };
        for (const r of rows)
            for (const k of Object.keys(t))
                t[k] += r[k];
        return t;
    }
    rates(t) {
        const round = (n) => Math.round(n * 10000) / 10000;
        return {
            viewRate: t.impressions ? round(t.views / t.impressions) : 0,
            avgWatchMs: t.views ? Math.round(t.watchTimeMs / t.views) : 0,
            completionRate: t.views ? round(t.completions / t.views) : 0,
            engagementRate: t.views
                ? round((t.likes + t.comments + t.shares) / t.views)
                : 0,
        };
    }
    async overview(userId, days, pageId) {
        let scope;
        let followTarget;
        let followers;
        if (pageId) {
            const page = await this.pagesService.requirePage(pageId);
            if (!(0, page_permissions_1.roleHasPermission)(this.pagesService.roleOf(page, userId), 'analytics.view')) {
                throw new common_1.ForbiddenException('Only the page owner or admins can see analytics');
            }
            scope = 'p.pageId = :scopeId';
            followTarget = { type: 'page', id: pageId };
            followers = page.followersCount;
        }
        else {
            const me = await this.userRepo.findOneOrFail({
                where: { id: userId },
                select: ['id', 'followersCount'],
            });
            scope = 'p.authorId = :scopeId AND p.pageId IS NULL';
            followTarget = { type: 'user', id: userId };
            followers = me.followersCount;
        }
        const scopeId = pageId ?? userId;
        const per = this.period(days);
        const base = () => this.statsRepo
            .createQueryBuilder('s')
            .innerJoin(post_entity_1.Post, 'p', 'p.id = s.postId')
            .where(scope, { scopeId })
            .andWhere('s.day >= :from', { from: per.from });
        const sums = [
            'SUM(s.impressions) AS impressions',
            'SUM(s.views) AS views',
            'SUM(s.newViewers) AS newViewers',
            'SUM(s.watchTimeMs) AS watchTimeMs',
            'SUM(s.completions) AS completions',
            'SUM(s.likes) AS likes',
            'SUM(s.comments) AS comments',
            'SUM(s.shares) AS shares',
        ];
        const toNums = (r) => ({
            impressions: Number(r?.impressions ?? 0),
            views: Number(r?.views ?? 0),
            newViewers: Number(r?.newViewers ?? 0),
            watchTimeMs: Number(r?.watchTimeMs ?? 0),
            completions: Number(r?.completions ?? 0),
            likes: Number(r?.likes ?? 0),
            comments: Number(r?.comments ?? 0),
            shares: Number(r?.shares ?? 0),
        });
        const dailyRows = await base()
            .select("DATE_FORMAT(s.day, '%Y-%m-%d')", 'day')
            .addSelect(sums)
            .groupBy('s.day')
            .getRawMany();
        const byDay = new Map(dailyRows.map((r) => [r.day, toNums(r)]));
        const empty = toNums({});
        const daily = per.list.map((day) => ({
            day,
            ...(byDay.get(day) ?? empty),
        }));
        const totals = this.sum(daily);
        const kindRows = await base()
            .select('p.kind', 'kind')
            .addSelect(sums)
            .groupBy('p.kind')
            .getRawMany();
        const byKind = { post: toNums({}), reel: toNums({}) };
        for (const r of kindRows)
            byKind[r.kind] = toNums(r);
        const topRows = await base()
            .andWhere('p.deletedAt IS NULL')
            .select('p.id', 'id')
            .addSelect('SUM(s.views)', 'views')
            .addSelect('SUM(s.likes + s.comments + s.shares)', 'interactions')
            .groupBy('p.id')
            .orderBy('views', 'DESC')
            .addOrderBy('p.id', 'DESC')
            .limit(5)
            .getRawMany();
        const topPosts = topRows.length
            ? await this.postRepo.find({
                where: { id: (0, typeorm_2.In)(topRows.map((r) => Number(r.id))) },
            })
            : [];
        const topById = new Map(topPosts.map((p) => [p.id, p]));
        const gainedRows = await this.followRepo
            .createQueryBuilder('f')
            .select("DATE_FORMAT(f.createdAt, '%Y-%m-%d')", 'day')
            .addSelect('COUNT(*)', 'n')
            .where('f.targetType = :t AND f.targetId = :id AND f.createdAt >= :from', {
            t: followTarget.type,
            id: followTarget.id,
            from: new Date(`${per.from}T00:00:00.000Z`),
        })
            .groupBy('day')
            .getRawMany();
        const gainedByDay = new Map(gainedRows.map((r) => [r.day, Number(r.n)]));
        const published = await this.postRepo
            .createQueryBuilder('p')
            .where(scope, { scopeId })
            .andWhere('p.deletedAt IS NULL AND p.createdAt >= :from', {
            from: new Date(`${per.from}T00:00:00.000Z`),
        })
            .getCount();
        return {
            scope: pageId ? { type: 'page', pageId } : { type: 'user', userId },
            period: { days: per.days, from: per.from, to: per.to },
            totals,
            rates: this.rates(totals),
            byKind,
            followers: {
                total: followers,
                gained: [...gainedByDay.values()].reduce((a, b) => a + b, 0),
                daily: per.list.map((day) => ({
                    day,
                    gained: gainedByDay.get(day) ?? 0,
                })),
            },
            published,
            topPosts: topRows
                .map((r) => {
                const p = topById.get(Number(r.id));
                return p
                    ? {
                        id: p.id,
                        kind: p.kind,
                        text: p.text ? p.text.slice(0, 100) : null,
                        thumbnail: p.media[0]?.thumbnailUrl ?? p.media[0]?.url ?? null,
                        views: Number(r.views),
                        interactions: Number(r.interactions),
                    }
                    : null;
            })
                .filter(Boolean),
            daily,
        };
    }
    assertEvents(events) {
        if (!Array.isArray(events) || !events.length || events.length > 50) {
            throw new common_1.BadRequestException('Send 1 to 50 events');
        }
    }
};
exports.PostAnalyticsService = PostAnalyticsService;
exports.PostAnalyticsService = PostAnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(post_entity_1.Post)),
    __param(1, (0, typeorm_1.InjectRepository)(post_engagement_entities_1.PostStatsDaily)),
    __param(2, (0, typeorm_1.InjectRepository)(follow_entity_1.Follow)),
    __param(3, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(4, (0, typeorm_1.InjectRepository)(page_entity_1.Page)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        posts_service_1.PostsService,
        post_stats_service_1.PostStatsService,
        pages_service_1.PagesService])
], PostAnalyticsService);
//# sourceMappingURL=post-analytics.service.js.map