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
exports.FollowService = exports.fullName = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const follow_entity_1 = require("./follow.entity");
const user_entity_1 = require("../users/entities/user.entity");
const page_entity_1 = require("../pages/entities/page.entity");
const follow_notifier_1 = require("./follow-notifier");
const fullName = (u) => `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim();
exports.fullName = fullName;
let FollowService = class FollowService {
    constructor(followRepo, userRepo, pageRepo, notifier) {
        this.followRepo = followRepo;
        this.userRepo = userRepo;
        this.pageRepo = pageRepo;
        this.notifier = notifier;
    }
    async follow(followerId, type, targetId) {
        await this.assertTarget(type, targetId, followerId);
        const created = await this.followRepo.manager.transaction(async (m) => {
            const res = await m
                .createQueryBuilder()
                .insert()
                .into(follow_entity_1.Follow)
                .values({ followerId, targetType: type, targetId })
                .orIgnore()
                .updateEntity(false)
                .execute();
            if (!((res.raw?.affectedRows ?? 0) > 0))
                return false;
            await m.increment(user_entity_1.User, { id: followerId }, 'followingCount', 1);
            await m.increment(type === 'user' ? user_entity_1.User : page_entity_1.Page, { id: targetId }, 'followersCount', 1);
            return true;
        });
        if (created)
            void this.notifier.onFollow(followerId, type, targetId);
        return {
            created,
            following: true,
            followersCount: await this.followersCount(type, targetId),
        };
    }
    async unfollow(followerId, type, targetId) {
        const removed = await this.followRepo.manager.transaction(async (m) => {
            const res = await m.delete(follow_entity_1.Follow, {
                followerId,
                targetType: type,
                targetId,
            });
            if (!res.affected)
                return false;
            await m
                .createQueryBuilder()
                .update(user_entity_1.User)
                .set({ followingCount: () => 'GREATEST(followingCount - 1, 0)' })
                .where('id = :id', { id: followerId })
                .execute();
            await m
                .createQueryBuilder()
                .update(type === 'user' ? user_entity_1.User : page_entity_1.Page)
                .set({ followersCount: () => 'GREATEST(followersCount - 1, 0)' })
                .where('id = :id', { id: targetId })
                .execute();
            return true;
        });
        return {
            removed,
            following: false,
            followersCount: await this.followersCount(type, targetId),
        };
    }
    async assertTarget(type, targetId, followerId) {
        if (type === 'user') {
            if (targetId === followerId) {
                throw new common_1.BadRequestException('You cannot follow yourself');
            }
            const user = await this.userRepo.findOne({
                where: { id: targetId },
                select: ['id', 'isBanned'],
            });
            if (!user || user.isBanned)
                throw new common_1.NotFoundException('User not found');
        }
        else if (!(await this.pageRepo.exist({ where: { id: targetId } }))) {
            throw new common_1.NotFoundException('Page not found');
        }
    }
    async followersCount(type, targetId) {
        const row = type === 'user'
            ? await this.userRepo.findOne({
                where: { id: targetId },
                select: ['id', 'followersCount'],
            })
            : await this.pageRepo.findOne({
                where: { id: targetId },
                select: ['id', 'followersCount'],
            });
        return row?.followersCount ?? 0;
    }
    async followedSet(viewerId, type, ids) {
        const unique = [...new Set(ids)];
        if (!viewerId || !unique.length)
            return new Set();
        const rows = await this.followRepo.find({
            where: { followerId: viewerId, targetType: type, targetId: (0, typeorm_2.In)(unique) },
            select: ['targetId'],
        });
        return new Set(rows.map((r) => r.targetId));
    }
    async isFollowing(viewerId, type, id) {
        return (await this.followedSet(viewerId, type, [id])).has(id);
    }
    async listFollowers(type, targetId, viewerId, opts = {}) {
        const exists = type === 'user'
            ? await this.userRepo.exist({ where: { id: targetId } })
            : await this.pageRepo.exist({ where: { id: targetId } });
        if (!exists)
            throw new common_1.NotFoundException('Not found');
        const limit = this.clampLimit(opts.limit);
        const qb = this.followRepo
            .createQueryBuilder('f')
            .where('f.targetType = :type AND f.targetId = :targetId', {
            type,
            targetId,
        })
            .orderBy('f.id', 'DESC')
            .take(limit + 1);
        if (opts.before)
            qb.andWhere('f.id < :before', { before: opts.before });
        const rows = await qb.getMany();
        const hasMore = rows.length > limit;
        const page = rows.slice(0, limit);
        const users = await this.usersById(page.map((r) => r.followerId));
        const followed = await this.followedSet(viewerId, 'user', page.map((r) => r.followerId));
        return {
            total: await this.followersCount(type, targetId),
            data: page
                .map((r) => users.get(r.followerId))
                .filter(Boolean)
                .map((u) => this.toPerson(u, viewerId, followed)),
            nextCursor: hasMore ? page[page.length - 1].id : null,
        };
    }
    async listFollowing(userId, kind, viewerId, opts = {}) {
        const user = await this.userRepo.findOne({
            where: { id: userId },
            select: ['id', 'isBanned', 'followingCount'],
        });
        if (!user || user.isBanned)
            throw new common_1.NotFoundException('User not found');
        const limit = this.clampLimit(opts.limit);
        const qb = this.followRepo
            .createQueryBuilder('f')
            .where('f.followerId = :userId', { userId })
            .orderBy('f.id', 'DESC')
            .take(limit + 1);
        if (kind !== 'all') {
            qb.andWhere('f.targetType = :t', {
                t: kind === 'users' ? 'user' : 'page',
            });
        }
        if (opts.before)
            qb.andWhere('f.id < :before', { before: opts.before });
        const rows = await qb.getMany();
        const hasMore = rows.length > limit;
        const slice = rows.slice(0, limit);
        const userIds = slice
            .filter((r) => r.targetType === 'user')
            .map((r) => r.targetId);
        const pageIds = slice
            .filter((r) => r.targetType === 'page')
            .map((r) => r.targetId);
        const users = await this.usersById(userIds);
        const pages = await this.pagesById(pageIds);
        const followedUsers = await this.followedSet(viewerId, 'user', userIds);
        const followedPages = await this.followedSet(viewerId, 'page', pageIds);
        const data = slice
            .map((r) => {
            if (r.targetType === 'user') {
                const u = users.get(r.targetId);
                return u
                    ? {
                        type: 'user',
                        ...this.toPerson(u, viewerId, followedUsers),
                    }
                    : null;
            }
            const p = pages.get(r.targetId);
            return p
                ? { type: 'page', ...this.toPageCard(p, followedPages) }
                : null;
        })
            .filter(Boolean);
        return {
            total: user.followingCount,
            data,
            nextCursor: hasMore ? slice[slice.length - 1].id : null,
        };
    }
    clampLimit(limit) {
        return Math.min(50, Math.max(1, Number(limit) || 20));
    }
    async usersById(ids) {
        const unique = [...new Set(ids)];
        const users = unique.length
            ? await this.userRepo.find({
                where: { id: (0, typeorm_2.In)(unique), isBanned: false },
                select: [
                    'id',
                    'firstName',
                    'lastName',
                    'username',
                    'profile_photo',
                    'headline',
                ],
            })
            : [];
        return new Map(users.map((u) => [u.id, u]));
    }
    async pagesById(ids) {
        const unique = [...new Set(ids)];
        const pages = unique.length
            ? await this.pageRepo.find({
                where: { id: (0, typeorm_2.In)(unique) },
                select: [
                    'id',
                    'page_name',
                    'username',
                    'page_logo',
                    'is_verified',
                    'followersCount',
                ],
            })
            : [];
        return new Map(pages.map((p) => [p.id, p]));
    }
    toPerson(u, viewerId, followed) {
        return {
            id: u.id,
            name: (0, exports.fullName)(u),
            username: u.username,
            profile_photo: u.profile_photo,
            headline: u.headline,
            isFollowing: followed.has(u.id),
            isMe: u.id === viewerId,
        };
    }
    toPageCard(p, followed) {
        return {
            id: p.id,
            page_name: p.page_name,
            username: p.username,
            page_logo: p.page_logo,
            is_verified: !!p.is_verified,
            followersCount: p.followersCount,
            isFollowing: followed.has(p.id),
        };
    }
};
exports.FollowService = FollowService;
exports.FollowService = FollowService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(follow_entity_1.Follow)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(page_entity_1.Page)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        follow_notifier_1.FollowNotifier])
], FollowService);
//# sourceMappingURL=follow.service.js.map