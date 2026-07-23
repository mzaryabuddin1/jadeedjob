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
const crypto_1 = require("crypto");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_entity_1 = require("../job/entities/job.entity");
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
const post_video_upload_session_entity_1 = require("./entities/post-video-upload-session.entity");
const post_video_storage_service_1 = require("./post-video-storage.service");
let PostsService = class PostsService {
    constructor(postRepo, likeRepo, saveRepo, commentRepo, reportRepo, followRepo, jobRepo, userRepo, videoUploadRepo, pagesService, storage, videoStorage) {
        this.postRepo = postRepo;
        this.likeRepo = likeRepo;
        this.saveRepo = saveRepo;
        this.commentRepo = commentRepo;
        this.reportRepo = reportRepo;
        this.followRepo = followRepo;
        this.jobRepo = jobRepo;
        this.userRepo = userRepo;
        this.videoUploadRepo = videoUploadRepo;
        this.pagesService = pagesService;
        this.storage = storage;
        this.videoStorage = videoStorage;
    }
    onModuleInit() {
        this.cleanupExpiredVideoUploads().catch(() => undefined);
        this.cleanupTimer = setInterval(() => {
            this.cleanupExpiredVideoUploads().catch(() => undefined);
        }, 60 * 60 * 1000);
        this.cleanupTimer.unref?.();
    }
    onModuleDestroy() {
        if (this.cleanupTimer)
            clearInterval(this.cleanupTimer);
    }
    async getFeed(query, viewerId) {
        const limit = Math.min(30, Math.max(1, Number(query.limit) || 10));
        const profileFiltered = Boolean(query.publisherType && query.publisherId);
        const cursor = this.decodeCursor(query.cursor);
        const qb = this.createViewableQuery();
        if (profileFiltered) {
            if (cursor && cursor.mode !== 'profile') {
                throw new common_1.BadRequestException('Post cursor does not match this feed');
            }
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
        if (cursor && cursor.mode !== 'feed') {
            throw new common_1.BadRequestException('Post cursor does not match this feed');
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
    async createVideoUpload(data, userId) {
        await this.cleanupExpiredVideoUploads();
        this.validateVideoMetadata(data.media);
        const publisher = await this.resolvePublisher(data.publisherType, data.publisherId, userId);
        const linkedJob = await this.validateLinkedJob(data.linkedJobId, publisher.type, publisher.companyId);
        const post = await this.postRepo.save(this.postRepo.create({
            creatorId: userId,
            publisherType: publisher.type,
            publisherCompanyId: publisher.companyId,
            body: this.normalizeBody(data.body),
            linkedJobId: linkedJob?.id ?? null,
            allowComments: this.parseBoolean(data.allowComments, true),
            mediaType: 'video',
            mediaStatus: 'upload_pending',
            videoContentType: data.media.contentType,
            videoFileSizeBytes: data.media.fileSizeBytes ?? null,
            videoDurationSeconds: data.media.durationSeconds
                ? Math.ceil(Number(data.media.durationSeconds))
                : null,
        }));
        const session = await this.createVideoUploadSession(post, data.media, userId, false);
        return {
            post: await this.formatPost(await this.getPostByIdOrThrow(post.id), userId),
            upload: this.videoStorage.getUploadInstructions(post, session),
        };
    }
    async createVideoReplacement(postId, media, userId) {
        await this.cleanupExpiredVideoUploads();
        this.validateVideoMetadata(media);
        const post = await this.getPostByIdOrThrow(postId);
        await this.assertCanManage(post, userId);
        const session = await this.createVideoUploadSession(post, media, userId, true);
        return {
            post: await this.formatPost(post, userId),
            upload: this.videoStorage.getUploadInstructions(post, session),
        };
    }
    async uploadVideo(postId, userId, uploadId, file) {
        if (!file)
            throw new common_1.BadRequestException('No video file provided');
        const { post, session } = await this.getOwnedVideoUploadSession(postId, userId, uploadId);
        if (session.status !== 'pending') {
            await this.videoStorage.deleteLocalFile(file.path);
            throw new common_1.BadRequestException('Upload session is not accepting files');
        }
        if (this.isExpired(session.expiresAt)) {
            await this.videoStorage.deleteLocalFile(file.path);
            await this.expireVideoUploadSession(session);
            throw new common_1.BadRequestException('Upload session has expired');
        }
        this.validateUploadedVideo(file);
        let stored = null;
        try {
            stored = await this.videoStorage.commitUpload(post, session, file);
            const inspection = await this.videoStorage.inspectVideo(stored.localFilePath);
            await this.videoUploadRepo.save({
                ...session,
                status: 'uploaded',
                uploadKey: stored.storageKey,
                uploadedFileName: stored.fileName,
                localFilePath: stored.localFilePath,
                publicUrl: stored.publicUrl,
                uploadedFileSizeBytes: file.size,
                uploadedDurationSeconds: inspection.durationSeconds,
                uploadedContentType: file.mimetype,
            });
        }
        catch (error) {
            await this.videoStorage.deleteLocalFile(file.path);
            await this.videoStorage.deleteLocalFile(stored?.localFilePath);
            await this.videoUploadRepo.save({
                ...session,
                status: 'failed',
                errorMessage: error instanceof Error ? error.message : 'Video upload failed',
            });
            if (!session.replacement) {
                await this.postRepo.update(post.id, { mediaStatus: 'failed' });
            }
            throw error;
        }
        if (!stored)
            throw new common_1.BadRequestException('Video upload failed');
        return {
            uploadId: session.uploadId,
            postId: String(post.id),
            status: 'uploaded',
            fileName: stored.fileName,
            fileSizeBytes: file.size,
            contentType: file.mimetype,
        };
    }
    async completeVideoUpload(postId, userId, uploadId) {
        const { post, session } = await this.getOwnedVideoUploadSession(postId, userId, uploadId);
        if (session.status === 'completed') {
            return this.formatPost(await this.getPostByIdOrThrow(postId), userId);
        }
        if (session.status !== 'uploaded' || !session.localFilePath) {
            throw new common_1.BadRequestException('Upload has not completed');
        }
        if (this.isExpired(session.expiresAt)) {
            await this.expireVideoUploadSession(session);
            throw new common_1.BadRequestException('Upload session has expired');
        }
        await this.assertCanManage(post, userId);
        await this.validateLinkedJob(post.linkedJobId, this.getPublisherType(post), post.publisherCompanyId);
        const thumbnail = await this.videoStorage.createThumbnail(post.id, session.localFilePath);
        const oldImageKey = post.imageStorageKey;
        const oldVideoKey = post.videoStorageKey;
        const oldThumbnailKey = post.videoThumbnailStorageKey;
        try {
            await this.postRepo.save({
                ...post,
                mediaType: 'video',
                mediaStatus: 'published',
                imageUrl: null,
                imageStorageKey: null,
                videoUrl: session.publicUrl,
                videoStorageKey: session.uploadKey,
                videoThumbnailUrl: thumbnail.publicUrl,
                videoThumbnailStorageKey: thumbnail.storageKey,
                videoContentType: session.uploadedContentType || session.contentType || null,
                videoFileSizeBytes: session.uploadedFileSizeBytes ??
                    session.expectedFileSizeBytes ??
                    null,
                videoDurationSeconds: session.uploadedDurationSeconds ??
                    session.clientDurationSeconds ??
                    null,
            });
            await this.videoUploadRepo.save({
                ...session,
                status: 'completed',
                completedAt: new Date(),
            });
        }
        catch (error) {
            await this.videoStorage.remove(thumbnail.storageKey);
            throw error;
        }
        await Promise.all([
            this.storage.remove(oldImageKey),
            oldVideoKey !== session.uploadKey
                ? this.videoStorage.remove(oldVideoKey)
                : Promise.resolve(),
            oldThumbnailKey !== thumbnail.storageKey
                ? this.videoStorage.remove(oldThumbnailKey)
                : Promise.resolve(),
        ]);
        return this.formatPost(await this.getPostByIdOrThrow(postId), userId);
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
            mediaType: image ? 'image' : 'none',
            mediaStatus: 'published',
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
        const removeMedia = this.parseBoolean(data.removeMedia, false);
        if (image && (removeImage || removeMedia)) {
            throw new common_1.BadRequestException('Choose replacement media or remove the current media, not both');
        }
        const hasBody = data.body !== undefined;
        const hasLinkedJob = data.linkedJobId !== undefined;
        const hasComments = data.allowComments !== undefined;
        if (!hasBody &&
            !hasLinkedJob &&
            !hasComments &&
            !removeImage &&
            !removeMedia &&
            !image) {
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
        const oldVideoStorageKey = post.videoStorageKey;
        const oldVideoThumbnailStorageKey = post.videoThumbnailStorageKey;
        if (removeImage || removeMedia) {
            post.imageUrl = null;
            post.imageStorageKey = null;
            if (!post.videoUrl)
                post.mediaType = 'none';
        }
        if (removeMedia) {
            this.clearVideoMedia(post);
            post.mediaType = 'none';
            post.mediaStatus = 'published';
        }
        let newStorageKey = null;
        if (image) {
            const stored = await this.storage.save(post.id, image);
            newStorageKey = stored.storageKey;
            post.imageUrl = stored.publicUrl;
            post.imageStorageKey = stored.storageKey;
            this.clearVideoMedia(post);
            post.mediaType = 'image';
            post.mediaStatus = 'published';
        }
        if (!post.body && !post.imageUrl && !post.videoUrl) {
            if (newStorageKey)
                await this.storage.remove(newStorageKey);
            throw new common_1.BadRequestException('A post needs text, a photo, or a video');
        }
        try {
            await this.postRepo.save(post);
        }
        catch (error) {
            if (newStorageKey)
                await this.storage.remove(newStorageKey);
            throw error;
        }
        if ((removeImage || removeMedia || image) &&
            oldStorageKey !== post.imageStorageKey) {
            await this.storage.remove(oldStorageKey);
        }
        if ((removeMedia || image) && oldVideoStorageKey !== post.videoStorageKey) {
            await this.videoStorage.remove(oldVideoStorageKey);
        }
        if ((removeMedia || image) &&
            oldVideoThumbnailStorageKey !== post.videoThumbnailStorageKey) {
            await this.videoStorage.remove(oldVideoThumbnailStorageKey);
        }
        return this.formatPost(await this.getPostByIdOrThrow(postId), userId);
    }
    async deletePost(postId, userId) {
        const post = await this.getPostByIdOrThrow(postId);
        await this.assertCanManage(post, userId);
        post.deletedAt = new Date();
        await this.postRepo.save(post);
        await Promise.all([
            this.storage.remove(post.imageStorageKey),
            this.videoStorage.remove(post.videoStorageKey),
            this.videoStorage.remove(post.videoThumbnailStorageKey),
        ]);
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
        if (this.wasInserted(result)) {
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
        if (this.wasInserted(result)) {
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
        if (existing) {
            throw new common_1.BadRequestException('Post already reported');
        }
        const report = this.reportRepo.create({
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
            .andWhere('post.mediaStatus = :publishedMediaStatus', {
            publishedMediaStatus: 'published',
        })
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
        if (!job || !this.isLinkedJobPublic(job)) {
            throw new common_1.BadRequestException('Linked job is not publicly available');
        }
        if (publisherType === 'company' &&
            (!publisherCompanyId || job.pageId !== publisherCompanyId)) {
            throw new common_1.BadRequestException('Company posts can only link jobs from that company');
        }
        return job;
    }
    async assertCanManage(post, userId) {
        if (this.getPublisherType(post) === 'user') {
            if (post.creatorId === userId)
                return;
            throw new common_1.ForbiddenException('You cannot manage this post');
        }
        if (!post.publisherCompanyId) {
            throw new common_1.ForbiddenException('You cannot manage this post');
        }
        const access = await this.pagesService.assertCompanyCanPublish(post.publisherCompanyId, userId);
        if (post.creatorId === userId)
            return;
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
        const [likes, saves, userFollows, companyFollows, companyAccess] = await Promise.all([
            this.likeRepo.find({
                where: { postId: (0, typeorm_2.In)(postIds), userId: viewerId },
            }),
            this.saveRepo.find({
                where: { postId: (0, typeorm_2.In)(postIds), userId: viewerId },
            }),
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
            this.getCompanyPublishingAccess(viewerId, companyPublisherIds),
        ]);
        const likedIds = new Set(likes.map((like) => like.postId));
        const savedIds = new Set(saves.map((save) => save.postId));
        const followed = new Set([...userFollows, ...companyFollows].map((follow) => `${follow.profileType}:${follow.profileId}`));
        return posts.map((post) => ({
            ...this.formatPostBase(post),
            viewerState: {
                liked: likedIds.has(post.id),
                saved: savedIds.has(post.id),
                followingPublisher: followed.has(`${this.getPublisherType(post)}:${this.getPublisherId(post)}`),
                isOwner: post.creatorId === viewerId,
                canManage: this.canManageFromAccess(post, viewerId, companyAccess.publishable, companyAccess.manageable),
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
            media: this.formatMedia(post),
            mediaStatus: post.mediaStatus,
            ...(post.linkedJob && this.isLinkedJobPublic(post.linkedJob)
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
    formatMedia(post) {
        if (post.mediaType === 'video' && post.videoUrl) {
            return {
                type: 'video',
                url: post.videoUrl,
                thumbnailUrl: post.videoThumbnailUrl,
                ...(post.videoDurationSeconds
                    ? { durationSeconds: Number(post.videoDurationSeconds) }
                    : {}),
            };
        }
        if (post.imageUrl) {
            return { type: 'image', url: post.imageUrl };
        }
        return null;
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
        try {
            await this.assertCanManage(post, viewerId);
            return true;
        }
        catch {
            return false;
        }
    }
    async getCompanyPublishingAccess(viewerId, companyIds) {
        const publishable = new Set();
        const manageable = new Set();
        const ids = Array.from(new Set(companyIds.filter(Boolean)));
        await Promise.all(ids.map(async (companyId) => {
            try {
                const access = await this.pagesService.assertCompanyCanPublish(companyId, viewerId);
                publishable.add(companyId);
                if (access.member.role === 'owner' ||
                    access.member.role === 'admin') {
                    manageable.add(companyId);
                }
            }
            catch {
            }
        }));
        return { publishable, manageable };
    }
    canManageFromAccess(post, viewerId, publishable, manageable) {
        if (this.getPublisherType(post) === 'user') {
            return post.creatorId === viewerId;
        }
        const companyId = Number(post.publisherCompanyId);
        return ((post.creatorId === viewerId && publishable.has(companyId)) ||
            manageable.has(companyId));
    }
    isLinkedJobPublic(job) {
        if (!job || !job.isActive || (job.status && job.status !== 'active')) {
            return false;
        }
        if (job.postingMode === 'company' || job.pageId) {
            return Boolean(job.pageId && job.page?.verificationStatus === 'approved');
        }
        return !job.creator?.isBanned;
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
    async createVideoUploadSession(post, media, userId, replacement) {
        return this.videoUploadRepo.save(this.videoUploadRepo.create({
            uploadId: (0, crypto_1.randomUUID)(),
            postId: post.id,
            userId,
            replacement,
            status: 'pending',
            uploadKey: this.videoStorage.createUploadKey(post.id, media.fileName, media.contentType),
            originalFileName: media.fileName,
            contentType: media.contentType,
            expectedFileSizeBytes: media.fileSizeBytes ?? null,
            clientDurationSeconds: media.durationSeconds
                ? Math.ceil(Number(media.durationSeconds))
                : null,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        }));
    }
    validateVideoMetadata(media) {
        if (!(0, post_video_storage_service_1.isAllowedPostVideoMimeType)(media.contentType)) {
            throw new common_1.BadRequestException('Use an MP4, MOV, or M4V video');
        }
        if (!(0, post_video_storage_service_1.isAllowedPostVideoFileName)(media.fileName)) {
            throw new common_1.BadRequestException('Use an MP4, MOV, or M4V video');
        }
        if (media.fileSizeBytes &&
            Number(media.fileSizeBytes) > post_video_storage_service_1.POST_VIDEO_MAX_BYTES) {
            throw new common_1.BadRequestException('Video must be 100 MB or smaller');
        }
    }
    validateUploadedVideo(file) {
        if (!(0, post_video_storage_service_1.isAllowedPostVideoMimeType)(file.mimetype) ||
            !(0, post_video_storage_service_1.isAllowedPostVideoFileName)(file.originalname)) {
            throw new common_1.BadRequestException('Use an MP4, MOV, or M4V video');
        }
        if (file.size > post_video_storage_service_1.POST_VIDEO_MAX_BYTES) {
            throw new common_1.BadRequestException('Video must be 100 MB or smaller');
        }
    }
    async getOwnedVideoUploadSession(postId, userId, uploadId) {
        const post = await this.getPostByIdOrThrow(postId);
        await this.assertCanManage(post, userId);
        const session = await this.videoUploadRepo.findOne({
            where: { postId, userId, uploadId },
        });
        if (!session)
            throw new common_1.NotFoundException('Upload session not found');
        return { post, session };
    }
    isExpired(value) {
        return new Date(value).getTime() <= Date.now();
    }
    async expireVideoUploadSession(session) {
        await this.videoStorage.deleteLocalFile(session.localFilePath);
        await this.videoUploadRepo.save({
            ...session,
            status: 'expired',
            errorMessage: 'Upload session expired',
        });
        if (!session.replacement) {
            await this.postRepo.update({ id: session.postId, mediaStatus: 'upload_pending' }, { mediaStatus: 'failed' });
        }
    }
    async cleanupExpiredVideoUploads() {
        const sessions = await this.videoUploadRepo
            .createQueryBuilder('session')
            .where('session.expiresAt < :now', { now: new Date() })
            .andWhere('session.status IN (:...statuses)', {
            statuses: ['pending', 'uploaded'],
        })
            .take(50)
            .getMany();
        for (const session of sessions) {
            await this.expireVideoUploadSession(session);
        }
    }
    clearVideoMedia(post) {
        post.videoUrl = null;
        post.videoStorageKey = null;
        post.videoThumbnailUrl = null;
        post.videoThumbnailStorageKey = null;
        post.videoContentType = null;
        post.videoFileSizeBytes = null;
        post.videoDurationSeconds = null;
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
    wasInserted(result) {
        if (typeof result.raw?.affectedRows === 'number') {
            return result.raw.affectedRows > 0;
        }
        return Boolean(result.identifiers?.length);
    }
    encodeCursor(cursor) {
        return Buffer.from(JSON.stringify(cursor)).toString('base64url');
    }
    decodeCursor(value) {
        if (!value)
            return null;
        try {
            const cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
            const id = Number(cursor?.id);
            if (cursor?.mode === 'feed' &&
                Number.isFinite(Number(cursor.score)) &&
                Number.isInteger(id) &&
                id > 0) {
                return { mode: 'feed', score: Number(cursor.score), id };
            }
            const createdAt = new Date(cursor?.createdAt);
            if (cursor?.mode === 'profile' &&
                !Number.isNaN(createdAt.getTime()) &&
                Number.isInteger(id) &&
                id > 0) {
                return {
                    mode: 'profile',
                    createdAt: createdAt.toISOString(),
                    id,
                };
            }
        }
        catch {
            throw new common_1.BadRequestException('Invalid post cursor');
        }
        throw new common_1.BadRequestException('Invalid post cursor');
    }
    encodeSimpleCursor(value) {
        return Buffer.from(JSON.stringify({
            id: value.id,
            createdAt: value.createdAt.toISOString(),
        })).toString('base64url');
    }
    decodeSimpleCursor(value) {
        if (!value)
            return null;
        try {
            const cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
            const id = Number(cursor?.id);
            const createdAt = new Date(cursor?.createdAt);
            if (Number.isNaN(createdAt.getTime()) ||
                !Number.isInteger(id) ||
                id <= 0) {
                throw new Error();
            }
            return { createdAt: createdAt.toISOString(), id };
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
    __param(8, (0, typeorm_1.InjectRepository)(post_video_upload_session_entity_1.PostVideoUploadSession)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        pages_service_1.PagesService,
        post_storage_service_1.PostStorageService,
        post_video_storage_service_1.PostVideoStorageService])
], PostsService);
//# sourceMappingURL=posts.service.js.map