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
exports.DiscoverService = exports.escapeLike = void 0;
exports.cleanQuery = cleanQuery;
exports.pageWindow = pageWindow;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../users/entities/user.entity");
const page_entity_1 = require("../pages/entities/page.entity");
const follow_service_1 = require("../follow/follow.service");
const posts_service_1 = require("../posts/posts.service");
const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&');
exports.escapeLike = escapeLike;
function cleanQuery(q, min = 2) {
    const text = String(q ?? '')
        .trim()
        .replace(/^@/, '');
    if (text.length < min) {
        throw new common_1.BadRequestException(`Type at least ${min} characters to search`);
    }
    return text.slice(0, 60);
}
function pageWindow(page, limit) {
    const take = Math.min(50, Math.max(1, Number(limit) || 20));
    const current = Math.max(1, Number(page) || 1);
    return { take, current, offset: (current - 1) * take };
}
let DiscoverService = class DiscoverService {
    constructor(userRepo, pageRepo, followService, postsService) {
        this.userRepo = userRepo;
        this.pageRepo = pageRepo;
        this.followService = followService;
        this.postsService = postsService;
        this.fullName = follow_service_1.fullName;
    }
    async searchUsers(q, viewerId, opts = {}) {
        const { take, current, offset } = pageWindow(opts.page, opts.limit);
        const safe = (0, exports.escapeLike)(q.toLowerCase());
        const params = {
            exact: q.toLowerCase(),
            prefix: `${safe}%`,
            like: `%${safe}%`,
            viewerId,
        };
        const rows = await this.userRepo
            .createQueryBuilder('u')
            .select('u.id', 'id')
            .addSelect(`CASE WHEN u.username = :exact THEN 0
              WHEN u.username LIKE :prefix THEN 1
              WHEN CONCAT(u.firstName, ' ', u.lastName) LIKE :prefix THEN 2
              WHEN u.firstName LIKE :prefix OR u.lastName LIKE :prefix THEN 3
              ELSE 4 END`, 'score')
            .where('u.isBanned = false AND u.id != :viewerId')
            .andWhere(new typeorm_2.Brackets((b) => b
            .where('u.username LIKE :prefix')
            .orWhere('u.firstName LIKE :prefix')
            .orWhere('u.lastName LIKE :prefix')
            .orWhere("CONCAT(u.firstName, ' ', u.lastName) LIKE :like")
            .orWhere('u.headline LIKE :like')))
            .setParameters(params)
            .orderBy('score', 'ASC')
            .addOrderBy('u.followersCount', 'DESC')
            .addOrderBy('u.id', 'ASC')
            .offset(offset)
            .limit(take + 1)
            .getRawMany();
        const hasMore = rows.length > take;
        const ids = rows.slice(0, take).map((r) => Number(r.id));
        const users = await this.userRepo.find({
            where: ids.map((id) => ({ id })),
            select: [
                'id',
                'firstName',
                'lastName',
                'username',
                'profile_photo',
                'headline',
                'followersCount',
                'open_to_work',
            ],
        });
        const byId = new Map(users.map((u) => [u.id, u]));
        const followed = await this.followService.followedSet(viewerId, 'user', ids);
        return {
            data: ids
                .map((id) => byId.get(id))
                .filter(Boolean)
                .map((u) => ({
                ...this.followService.toPerson(u, viewerId, followed),
                followersCount: u.followersCount,
                open_to_work: u.open_to_work,
            })),
            page: current,
            limit: take,
            hasMore,
        };
    }
    async searchPages(q, viewerId, opts = {}) {
        const { take, current, offset } = pageWindow(opts.page, opts.limit);
        const safe = (0, exports.escapeLike)(q.toLowerCase());
        const params = {
            exact: q.toLowerCase(),
            prefix: `${safe}%`,
            like: `%${safe}%`,
        };
        const rows = await this.pageRepo
            .createQueryBuilder('p')
            .select('p.id', 'id')
            .addSelect(`CASE WHEN p.username = :exact THEN 0
              WHEN p.username LIKE :prefix OR p.page_name LIKE :prefix THEN 1
              ELSE 2 END`, 'score')
            .where(new typeorm_2.Brackets((b) => b
            .where('p.username LIKE :prefix')
            .orWhere('p.page_name LIKE :like')
            .orWhere('p.business_name LIKE :like')
            .orWhere('p.industry_type LIKE :like')))
            .setParameters(params)
            .orderBy('score', 'ASC')
            .addOrderBy('p.is_verified', 'DESC')
            .addOrderBy('p.followersCount', 'DESC')
            .addOrderBy('p.id', 'ASC')
            .offset(offset)
            .limit(take + 1)
            .getRawMany();
        const hasMore = rows.length > take;
        const ids = rows.slice(0, take).map((r) => Number(r.id));
        const pages = await this.followService.pagesById(ids);
        const followed = await this.followService.followedSet(viewerId, 'page', ids);
        return {
            data: ids
                .map((id) => pages.get(id))
                .filter(Boolean)
                .map((p) => this.followService.toPageCard(p, followed)),
            page: current,
            limit: take,
            hasMore,
        };
    }
    searchPosts(q, viewerId, opts) {
        return this.postsService.search(viewerId, q, {
            kind: opts.kind,
            page: Number(opts.page) || undefined,
            limit: Number(opts.limit) || undefined,
        });
    }
    hashtags(q) {
        return this.postsService.hashtagSearch(q);
    }
    async searchAll(q, viewerId) {
        const five = { page: 1, limit: 5 };
        const tagOnly = q.startsWith('#');
        const [users, pages, posts, reels, hashtags] = await Promise.all([
            tagOnly ? null : this.searchUsers(q.replace(/^#/, ''), viewerId, five),
            tagOnly ? null : this.searchPages(q.replace(/^#/, ''), viewerId, five),
            this.postsService.search(viewerId, q, { kind: 'post', limit: 5 }),
            this.postsService.search(viewerId, q, { kind: 'reel', limit: 5 }),
            this.postsService.hashtagSearch(q, 5),
        ]);
        return {
            query: q,
            users: users?.data ?? [],
            pages: pages?.data ?? [],
            posts: posts.data,
            reels: reels.data,
            hashtags,
        };
    }
    async home(viewerId) {
        const [hashtags, reels, users, pages] = await Promise.all([
            this.postsService.trendingHashtags(3, 10),
            this.postsService.reelsFeed(viewerId, { page: 1, limit: 8 }),
            this.suggestedUsers(viewerId, 10),
            this.suggestedPages(viewerId, 10),
        ]);
        return {
            trendingHashtags: hashtags,
            trendingReels: reels.data,
            suggestedUsers: users,
            suggestedPages: pages,
        };
    }
    async suggestedUsers(viewerId, limit = 10) {
        const me = await this.userRepo.findOne({
            where: { id: viewerId },
            select: ['id', 'city'],
        });
        const rows = await this.userRepo
            .createQueryBuilder('u')
            .select('u.id', 'id')
            .addSelect('(u.city <=> :city)', 'sameCity')
            .where('u.id != :me AND u.isBanned = false AND u.username IS NOT NULL', {
            me: viewerId,
        })
            .andWhere(`NOT EXISTS (SELECT 1 FROM follows f
           WHERE f.followerId = :me AND f.targetType = 'user' AND f.targetId = u.id)`)
            .setParameter('city', me?.city ?? null)
            .orderBy('sameCity', 'DESC')
            .addOrderBy('u.followersCount', 'DESC')
            .addOrderBy('u.id', 'DESC')
            .limit(limit)
            .getRawMany();
        const ids = rows.map((r) => Number(r.id));
        const users = ids.length
            ? await this.userRepo.find({
                where: ids.map((id) => ({ id })),
                select: [
                    'id',
                    'firstName',
                    'lastName',
                    'username',
                    'profile_photo',
                    'headline',
                    'followersCount',
                ],
            })
            : [];
        const byId = new Map(users.map((u) => [u.id, u]));
        return ids
            .map((id) => byId.get(id))
            .filter(Boolean)
            .map((u) => ({
            ...this.followService.toPerson(u, viewerId, new Set()),
            followersCount: u.followersCount,
        }));
    }
    async suggestedPages(viewerId, limit = 10) {
        const rows = await this.pageRepo
            .createQueryBuilder('p')
            .select('p.id', 'id')
            .where('p.ownerId != :me', { me: viewerId })
            .andWhere(`NOT EXISTS (SELECT 1 FROM follows f
           WHERE f.followerId = :me AND f.targetType = 'page' AND f.targetId = p.id)`)
            .orderBy('p.is_verified', 'DESC')
            .addOrderBy('p.followersCount', 'DESC')
            .addOrderBy('p.id', 'DESC')
            .limit(limit)
            .getRawMany();
        const ids = rows.map((r) => Number(r.id));
        const pages = await this.followService.pagesById(ids);
        return ids
            .map((id) => pages.get(id))
            .filter(Boolean)
            .map((p) => this.followService.toPageCard(p, new Set()));
    }
};
exports.DiscoverService = DiscoverService;
exports.DiscoverService = DiscoverService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(page_entity_1.Page)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        follow_service_1.FollowService,
        posts_service_1.PostsService])
], DiscoverService);
//# sourceMappingURL=discover.service.js.map