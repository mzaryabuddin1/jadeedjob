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
exports.PostsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_entity_1 = require("../job/entities/job.entity");
const company_permissions_1 = require("../pages/company-permissions");
const pages_service_1 = require("../pages/pages.service");
const profile_follow_entity_1 = require("../profiles/entities/profile-follow.entity");
const profile_format_util_1 = require("../profiles/profile-format.util");
const user_entity_1 = require("../users/entities/user.entity");
const community_post_entity_1 = require("./entities/community-post.entity");
const post_comment_entity_1 = require("./entities/post-comment.entity");
const post_like_entity_1 = require("./entities/post-like.entity");
const post_report_entity_1 = require("./entities/post-report.entity");
const post_save_entity_1 = require("./entities/post-save.entity");
const post_storage_service_1 = require("./post-storage.service");
let PostsService = class PostsService {
    constructor(postRepo, likeRepo, saveRepo, commentRepo, reportRepo, followRepo, jobRepo, userRepo, pagesService, storage) {
        this.postRepo = postRepo;
        this.likeRepo = likeRepo;
        this.saveRepo = saveRepo;
        this.commentRepo = commentRepo;
        this.reportRepo = reportRepo;
        this.followRepo = followRepo;
        this.jobRepo = jobRepo;
        this.userRepo = userRepo;
        this.pagesService = pagesService;
        this.storage = storage;
    }
    async getFeed(query, viewerId) {
        const limit = Math.min(30, Math.max(1, Number(query.limit) || 10));
        const profileFiltered = Boolean(query.publisherType && query.publisherId);
        const cursor = this.decodeCursor(query.cursor);
        const qb = this.createViewableQuery();
        if (profileFiltered) {
            this.applyPublisherFilter(qb, query.publisherType, Number(query.publisherId));
            if (cursor?.mode === 'profile') {
                qb.andWhere(new typeorm_2.Brackets((cursorQb) => {
                    cursorQb.where('post.createdAt < :cursorCreatedAt', {
                        cursorCreatedAt: cursor.createdAt,
                    });
                    cursorQb.orWhere('post.createdAt = :cursorCreatedAt AND post.id < :cursorId', { cursorCreatedAt: cursor.createdAt, cursorId: cursor.id });
                }));
            }
            const posts = await qb
                .orderBy('post.createdAt', 'DESC')
                .addOrderBy('post.id', 'DESC')
                .take(limit + 1)
                .getMany();
            const hasMore = posts.length > limit;
            const pageItems = hasMore ? posts.slice(0, limit) : posts;
            return {
                data: await this.formatPosts(pageItems, viewerId),
                nextCursor: hasMore && pageItems.length
                    ? this.encodeCursor({
                        mode: 'profile',
                        createdAt: pageItems[pageItems.length - 1].createdAt.toISOString(),
                        id: pageItems[pageItems.length - 1].id,
                    })
                    : null,
            };
        }
        const scoreSql = `(UNIX_TIMESTAMP(post.createdAt) + CASE WHEN ${this.publisherFollowExistsSql('post')} THEN 86400 ELSE 0 END)`;
        if (cursor?.mode === 'feed') {
            qb.andWhere(new typeorm_2.Brackets((cursorQb) => {
                cursorQb.where(`${scoreSql} < :cursorScore`, {
                    cursorScore: cursor.score,
                    viewerId,
                });
                cursorQb.orWhere(`${scoreSql} = :cursorScore AND post.id < :cursorId`, { cursorScore: cursor.score, cursorId: cursor.id, viewerId });
            }));
        }
        const { entities, raw } = await qb
            .setParameter('viewerId', viewerId)
            .addSelect(scoreSql, 'feedScore')
            .orderBy('feedScore', 'DESC')
            .addOrderBy('post.id', 'DESC')
            .take(limit + 1)
            .getRawAndEntities();
        const hasMore = entities.length > limit;
        const pageItems = hasMore ? entities.slice(0, limit) : entities;
        const lastIndex = pageItems.length - 1;
        const lastScore = lastIndex >= 0 ? Number(raw[lastIndex]?.feedScore) : 0;
        return {
            data: await this.formatPosts(pageItems, viewerId),
            nextCursor: hasMore && lastIndex >= 0
                ? this.encodeCursor({
                    mode: 'feed',
                    score: lastScore,
                    id: pageItems[lastIndex].id,
                })
                : null,
        };
    }
    async getPost(postId, viewerId) {
        return this.formatPost(await this.getViewablePostOrThrow(postId), viewerId);
    }
    async createPost(data, image, userId) {
        const body = this.normalizeBody(data.body);
        if (!body && !image) {
            throw new common_1.BadRequestException('Add text or an image to publish');
        }
        const publisher = await this.resolvePublisher(data.publisherType, data.publisherId, userId);
        const linkedJob = await this.validateLinkedJob(data.linkedJobId, publisher.type, publisher.companyId);
        const post = await this.postRepo.save(this.postRepo.create({
            creatorId: userId,
            publisherType: publisher.type,
            publisherCompanyId: publisher.companyId,
            body,
            linkedJobId: linkedJob?.id ?? null,
            allowComments: this.parseBoolean(data.allowComments, true),
        }));
        if (image) {
            try {
                const stored = await this.storage.save(post.id, image);
                post.imageUrl = stored.publicUrl;
                post.imageStorageKey = stored.storageKey;
                await this.postRepo.save(post);
            }
            catch (error) {
                await this.postRepo.delete(post.id);
                throw error;
            }
        }
        return this.formatPost(await this.getPostByIdOrThrow(post.id), userId);
    }
    async updatePost(postId, data, image, userId) {
        const post = await this.getPostByIdOrThrow(postId);
        await this.assertCanManage(post, userId);
        const removeImage = this.parseBoolean(data.removeImage, false);
        if (image && removeImage) {
            throw new common_1.BadRequestException('Choose a replacement image or remove the current image, not both');
        }
        const hasBody = data.body !== undefined;
        const hasLinkedJob = data.linkedJobId !== undefined;
        const hasComments = data.allowComments !== undefined;
        if (!hasBody && !hasLinkedJob && !hasComments && !removeImage && !image) {
            throw new common_1.BadRequestException('No post changes were provided');
        }
        if (hasBody)
            post.body = this.normalizeBody(data.body);
        if (hasComments) {
            post.allowComments = this.parseBoolean(data.allowComments, true);
        }
        if (hasLinkedJob) {
            const linkedJob = await this.validateLinkedJob(data.linkedJobId, this.getPublisherType(post), post.publisherCompanyId);
            post.linkedJobId = linkedJob?.id ?? null;
        }
        const oldStorageKey = post.imageStorageKey;
        if (removeImage) {
            post.imageUrl = null;
            post.imageStorageKey = null;
        }
        let newStorageKey = null;
        if (image) {
            const stored = await this.storage.save(post.id, image);
            newStorageKey = stored.storageKey;
            post.imageUrl = stored.publicUrl;
            post.imageStorageKey = stored.storageKey;
        }
        if (!post.body && !post.imageUrl) {
            if (newStorageKey)
                await this.storage.remove(newStorageKey);
            throw new common_1.BadRequestException('A post needs text or an image');
        }
        try {
            await this.postRepo.save(post);
        }
        catch (error) {
            if (newStorageKey)
                await this.storage.remove(newStorageKey);
            throw error;
        }
        if ((removeImage || image) && oldStorageKey !== post.imageStorageKey) {
            await this.storage.remove(oldStorageKey);
        }
        return this.formatPost(await this.getPostByIdOrThrow(postId), userId);
    }
    async deletePost(postId, userId) {
        const post = await this.getPostByIdOrThrow(postId);
        await this.assertCanManage(post, userId);
        post.deletedAt = new Date();
        await this.postRepo.save(post);
        await this.storage.remove(post.imageStorageKey);
        return { id: String(post.id), deleted: true };
    }
    async like(postId, userId) {
        await this.getViewablePostOrThrow(postId);
        const result = await this.likeRepo
            .createQueryBuilder()
            .insert()
            .values({ postId, userId })
            .orIgnore()
            .execute();
        if (result.identifiers.length) {
            await this.postRepo.increment({ id: postId }, 'likesCount', 1);
        }
        return this.getPost(postId, userId);
    }
    async unlike(postId, userId) {
        await this.getViewablePostOrThrow(postId);
        const result = await this.likeRepo.delete({ postId, userId });
        if (result.affected)
            await this.decrementCounter(postId, 'likesCount');
        return this.getPost(postId, userId);
    }
    async save(postId, userId) {
        await this.getViewablePostOrThrow(postId);
        const result = await this.saveRepo
            .createQueryBuilder()
            .insert()
            .values({ postId, userId })
            .orIgnore()
            .execute();
        if (result.identifiers.length) {
            await this.postRepo.increment({ id: postId }, 'savesCount', 1);
        }
        return this.getPost(postId, userId);
    }
    async unsave(postId, userId) {
        await this.getViewablePostOrThrow(postId);
        const result = await this.saveRepo.delete({ postId, userId });
        if (result.affected)
            await this.decrementCounter(postId, 'savesCount');
        return this.getPost(postId, userId);
    }
    async share(postId, userId) {
        await this.getViewablePostOrThrow(postId);
        await this.postRepo.increment({ id: postId }, 'sharesCount', 1);
        return this.getPost(postId, userId);
    }
    async getComments(postId, viewerId, cursor, limit = 20) {
        await this.getViewablePostOrThrow(postId);
        const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
        const decoded = this.decodeSimpleCursor(cursor);
        const qb = this.commentRepo
            .createQueryBuilder('comment')
            .leftJoinAndSelect('comment.user', 'user')
            .where('comment.postId = :postId', { postId })
            .andWhere('user.isBanned = :isBanned', { isBanned: false });
        if (decoded) {
            qb.andWhere(new typeorm_2.Brackets((cursorQb) => {
                cursorQb.where('comment.createdAt < :createdAt', decoded);
                cursorQb.orWhere('comment.createdAt = :createdAt AND comment.id < :id', decoded);
            }));
        }
        const comments = await qb
            .orderBy('comment.createdAt', 'DESC')
            .addOrderBy('comment.id', 'DESC')
            .take(safeLimit + 1)
            .getMany();
        const hasMore = comments.length > safeLimit;
        const pageItems = hasMore ? comments.slice(0, safeLimit) : comments;
        return {
            data: pageItems.map((comment) => this.formatComment(comment)),
            nextCursor: hasMore && pageItems.length
                ? this.encodeSimpleCursor(pageItems[pageItems.length - 1])
                : null,
        };
    }
    async addComment(postId, userId, text) {
        const post = await this.getViewablePostOrThrow(postId);
        if (!post.allowComments) {
            throw new common_1.BadRequestException('Comments are disabled for this post');
        }
        const comment = await this.commentRepo.save(this.commentRepo.create({ postId, userId, text: text.trim() }));
        await this.postRepo.increment({ id: postId }, 'commentsCount', 1);
        return this.formatComment(await this.commentRepo.findOne({
            where: { id: comment.id },
            relations: ['user'],
        }));
    }
    async report(postId, userId, reason = 'other', details) {
        const post = await this.getViewablePostOrThrow(postId);
        if (post.creatorId === userId) {
            throw new common_1.BadRequestException('You cannot report your own post');
        }
        const existing = await this.reportRepo.findOne({
            where: { postId, userId },
        });
        const report = this.reportRepo.create({
            ...(existing || {}),
            postId,
            userId,
            reason: reason.trim() || 'other',
            details: details?.trim() || null,
        });
        await this.reportRepo.save(report);
        return { reported: true };
    }
    createViewableQuery() {
        return this.postRepo
            .createQueryBuilder('post')
            .leftJoinAndSelect('post.creator', 'creator')
            .leftJoinAndSelect('post.publisherCompany', 'publisherCompany')
            .leftJoinAndSelect('post.linkedJob', 'linkedJob')
            .leftJoinAndSelect('linkedJob.page', 'linkedJobPage')
            .leftJoinAndSelect('linkedJob.creator', 'linkedJobCreator')
            .where('post.deletedAt IS NULL')
            .andWhere('creator.isBanned = :publisherBanned', {
            publisherBanned: false,
        })
            .andWhere(`(
          post.publisherType = 'user'
          OR publisherCompany.verificationStatus = 'approved'
        )`);
    }
    applyPublisherFilter(qb, type, id) {
        if (!Number.isInteger(id) || id <= 0) {
            throw new common_1.BadRequestException('Invalid publisher ID');
        }
        if (type === 'company') {
            qb.andWhere('post.publisherType = :publisherType', {
                publisherType: 'company',
            }).andWhere('post.publisherCompanyId = :publisherId', {
                publisherId: id,
            });
            return;
        }
        qb.andWhere('post.publisherType = :publisherType', {
            publisherType: 'user',
        }).andWhere('post.creatorId = :publisherId', { publisherId: id });
    }
    async getViewablePostOrThrow(postId) {
        const post = await this.createViewableQuery()
            .andWhere('post.id = :postId', { postId })
            .getOne();
        if (!post)
            throw new common_1.NotFoundException('Post not found');
        return post;
    }
    async getPostByIdOrThrow(postId) {
        const post = await this.postRepo.findOne({
            where: { id: postId },
            relations: [
                'creator',
                'publisherCompany',
                'linkedJob',
                'linkedJob.page',
                'linkedJob.creator',
            ],
        });
        if (!post || post.deletedAt)
            throw new common_1.NotFoundException('Post not found');
        return post;
    }
    async resolvePublisher(type, publisherId, userId) {
        if (!type || type === 'user') {
            const user = await this.userRepo.findOne({ where: { id: userId } });
            if (!user || user.isBanned) {
                throw new common_1.ForbiddenException('This account cannot publish posts');
            }
            return { type: 'user', companyId: null };
        }
        if (type !== 'company') {
            throw new common_1.BadRequestException('publisherType must be user or company');
        }
        const companyId = Number(publisherId);
        if (!Number.isInteger(companyId) || companyId <= 0) {
            throw new common_1.BadRequestException('publisherId is required for a company');
        }
        await this.pagesService.assertCompanyCanPublish(companyId, userId);
        return { type: 'company', companyId };
    }
    async validateLinkedJob(value, publisherType, publisherCompanyId) {
        if (value === undefined || value === null || value === '')
            return null;
        const jobId = Number(value);
        if (!Number.isInteger(jobId) || jobId <= 0) {
            throw new common_1.BadRequestException('Invalid linked job');
        }
        const job = await this.jobRepo.findOne({
            where: { id: jobId },
            relations: ['page', 'creator'],
        });
        const active = Boolean(job?.isActive && (!job.status || job.status === 'active'));
        const companyViewable = job?.postingMode !== 'company' ||
            !job.pageId ||
            job.page?.verificationStatus === 'approved';
        if (!job || !active || !companyViewable) {
            throw new common_1.BadRequestException('Linked job is not publicly available');
        }
        if (publisherType === 'company' &&
            (!publisherCompanyId || job.pageId !== publisherCompanyId)) {
            throw new common_1.BadRequestException('Company posts can only link jobs from that company');
        }
        return job;
    }
    async assertCanManage(post, userId) {
        if (post.creatorId === userId)
            return;
        if (this.getPublisherType(post) !== 'company' || !post.publisherCompanyId) {
            throw new common_1.ForbiddenException('You cannot manage this post');
        }
        const access = await this.pagesService.getCompanyAccess(post.publisherCompanyId, userId, 'publishContent');
        const role = access.member.role;
        if (role !== 'owner' && role !== 'admin') {
            throw new common_1.ForbiddenException('You cannot manage this post');
        }
    }
    async formatPosts(posts, viewerId) {
        if (!posts.length)
            return [];
        const postIds = posts.map((post) => post.id);
        const publisherKeys = posts.map((post) => ({
            type: this.getPublisherType(post),
            id: this.getPublisherId(post),
        }));
        const userPublisherIds = publisherKeys
            .filter((item) => item.type === 'user')
            .map((item) => item.id);
        const companyPublisherIds = publisherKeys
            .filter((item) => item.type === 'company')
            .map((item) => item.id);
        const [likes, saves, userFollows, companyFollows, manageableCompanies] = await Promise.all([
            this.likeRepo.find({ where: { postId: (0, typeorm_2.In)(postIds), userId: viewerId } }),
            this.saveRepo.find({ where: { postId: (0, typeorm_2.In)(postIds), userId: viewerId } }),
            userPublisherIds.length
                ? this.followRepo.find({
                    where: {
                        followerUserId: viewerId,
                        profileType: 'user',
                        profileId: (0, typeorm_2.In)(userPublisherIds),
                    },
                })
                : Promise.resolve([]),
            companyPublisherIds.length
                ? this.followRepo.find({
                    where: {
                        followerUserId: viewerId,
                        profileType: 'company',
                        profileId: (0, typeorm_2.In)(companyPublisherIds),
                    },
                })
                : Promise.resolve([]),
            this.pagesService.getManageablePublishingCompanyIds(viewerId, companyPublisherIds),
        ]);
        const likedIds = new Set(likes.map((like) => like.postId));
        const savedIds = new Set(saves.map((save) => save.postId));
        const followed = new Set([...userFollows, ...companyFollows].map((follow) => `${follow.profileType}:${follow.profileId}`));
        const manageableCompanyIds = new Set(manageableCompanies);
        return posts.map((post) => ({
            ...this.formatPostBase(post),
            viewerState: {
                liked: likedIds.has(post.id),
                saved: savedIds.has(post.id),
                followingPublisher: followed.has(`${this.getPublisherType(post)}:${this.getPublisherId(post)}`),
                isOwner: post.creatorId === viewerId,
                canManage: post.creatorId === viewerId ||
                    (this.getPublisherType(post) === 'company' &&
                        manageableCompanyIds.has(Number(post.publisherCompanyId))),
            },
        }));
    }
    async formatPost(post, viewerId) {
        const [like, save, follow, canManage] = await Promise.all([
            this.likeRepo.findOne({ where: { postId: post.id, userId: viewerId } }),
            this.saveRepo.findOne({ where: { postId: post.id, userId: viewerId } }),
            this.followRepo.findOne({
                where: {
                    followerUserId: viewerId,
                    profileType: this.getPublisherType(post),
                    profileId: this.getPublisherId(post),
                },
            }),
            this.canManage(post, viewerId),
        ]);
        return {
            ...this.formatPostBase(post),
            viewerState: {
                liked: Boolean(like),
                saved: Boolean(save),
                followingPublisher: Boolean(follow),
                isOwner: post.creatorId === viewerId,
                canManage,
            },
        };
    }
    formatPostBase(post) {
        return {
            id: String(post.id),
            publisher: this.formatPublisher(post),
            body: post.body,
            imageUrl: post.imageUrl,
            ...(post.linkedJob
                ? { linkedJob: this.formatLinkedJob(post.linkedJob) }
                : {}),
            stats: {
                likes: Number(post.likesCount || 0),
                comments: Number(post.commentsCount || 0),
                saves: Number(post.savesCount || 0),
                shares: Number(post.sharesCount || 0),
            },
            allowComments: post.allowComments,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
        };
    }
    formatPublisher(post) {
        if (this.getPublisherType(post) === 'company') {
            return {
                ...(0, profile_format_util_1.formatCompanyPublisher)(post.publisherCompany),
                id: String(post.publisherCompanyId),
            };
        }
        return {
            ...(0, profile_format_util_1.formatUserPublisher)(post.creator),
            id: String(post.creatorId),
        };
    }
    formatLinkedJob(job) {
        const creatorName = job.creator?.full_name ||
            [job.creator?.firstName, job.creator?.lastName]
                .filter(Boolean)
                .join(' ')
                .trim();
        return {
            id: String(job.id),
            title: job.title,
            companyName: job.page?.company_name || creatorName || 'Employer',
            salaryAmount: Number(job.salaryAmount || 0),
            salaryType: job.salaryType,
            currency: job.currency || 'PKR',
        };
    }
    formatComment(comment) {
        if (!comment)
            return null;
        return {
            id: String(comment.id),
            postId: String(comment.postId),
            author: (0, profile_format_util_1.formatUserPublisher)(comment.user),
            text: comment.text,
            createdAt: comment.createdAt,
        };
    }
    async canManage(post, viewerId) {
        if (post.creatorId === viewerId)
            return true;
        if (this.getPublisherType(post) !== 'company' || !post.publisherCompanyId) {
            return false;
        }
        try {
            const access = await this.pagesService.getCompanyAccess(post.publisherCompanyId, viewerId);
            const permissions = (0, company_permissions_1.normalizeCompanyPermissions)(access.member.role, access.member.permissions);
            return ((access.member.role === 'owner' || access.member.role === 'admin') &&
                permissions.publishContent);
        }
        catch {
            return false;
        }
    }
    getPublisherType(post) {
        return post.publisherType === 'company' ? 'company' : 'user';
    }
    getPublisherId(post) {
        return this.getPublisherType(post) === 'company'
            ? Number(post.publisherCompanyId)
            : Number(post.creatorId);
    }
    publisherFollowExistsSql(alias) {
        return `EXISTS (
      SELECT 1 FROM profile_follows follow
      WHERE follow.followerUserId = :viewerId
        AND (
          (follow.profileType = 'user' AND ${alias}.publisherType = 'user' AND follow.profileId = ${alias}.creatorId)
          OR
          (follow.profileType = 'company' AND ${alias}.publisherType = 'company' AND follow.profileId = ${alias}.publisherCompanyId)
        )
    )`;
    }
    normalizeBody(value) {
        const body = typeof value === 'string' ? value.trim() : '';
        if (body.length > 2000) {
            throw new common_1.BadRequestException('Post text must be 2,000 characters or less');
        }
        return body || null;
    }
    parseBoolean(value, fallback) {
        if (typeof value === 'boolean')
            return value;
        if (value === 'true')
            return true;
        if (value === 'false')
            return false;
        return fallback;
    }
    async decrementCounter(postId, field) {
        await this.postRepo
            .createQueryBuilder()
            .update(community_post_entity_1.CommunityPost)
            .set({ [field]: () => `GREATEST(${field} - 1, 0)` })
            .where('id = :postId', { postId })
            .execute();
    }
    encodeCursor(cursor) {
        return Buffer.from(JSON.stringify(cursor)).toString('base64url');
    }
    decodeCursor(value) {
        if (!value)
            return null;
        try {
            const cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
            if (cursor?.mode === 'feed' && Number.isFinite(Number(cursor.score))) {
                return { mode: 'feed', score: Number(cursor.score), id: Number(cursor.id) };
            }
            if (cursor?.mode === 'profile' && cursor.createdAt) {
                return {
                    mode: 'profile',
                    createdAt: String(cursor.createdAt),
                    id: Number(cursor.id),
                };
            }
        }
        catch {
            throw new common_1.BadRequestException('Invalid post cursor');
        }
        throw new common_1.BadRequestException('Invalid post cursor');
    }
    encodeSimpleCursor(value) {
        return Buffer.from(JSON.stringify({ id: value.id, createdAt: value.createdAt.toISOString() })).toString('base64url');
    }
    decodeSimpleCursor(value) {
        if (!value)
            return null;
        try {
            const cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
            if (!cursor?.createdAt || !Number(cursor.id))
                throw new Error();
            return { createdAt: String(cursor.createdAt), id: Number(cursor.id) };
        }
        catch {
            throw new common_1.BadRequestException('Invalid comments cursor');
        }
    }
};
exports.PostsService = PostsService;
exports.PostsService = PostsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(community_post_entity_1.CommunityPost)),
    __param(1, (0, typeorm_1.InjectRepository)(post_like_entity_1.PostLike)),
    __param(2, (0, typeorm_1.InjectRepository)(post_save_entity_1.PostSave)),
    __param(3, (0, typeorm_1.InjectRepository)(post_comment_entity_1.PostComment)),
    __param(4, (0, typeorm_1.InjectRepository)(post_report_entity_1.PostReport)),
    __param(5, (0, typeorm_1.InjectRepository)(profile_follow_entity_1.ProfileFollow)),
    __param(6, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __param(7, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        pages_service_1.PagesService,
        post_storage_service_1.PostStorageService])
], PostsService);
//# sourceMappingURL=posts.service.js.map