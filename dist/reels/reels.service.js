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
exports.ReelsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto_1 = require("crypto");
const job_entity_1 = require("../job/entities/job.entity");
const user_entity_1 = require("../users/entities/user.entity");
const reel_storage_service_1 = require("./reel-storage.service");
const reel_entity_1 = require("./entities/reel.entity");
const reel_upload_session_entity_1 = require("./entities/reel-upload-session.entity");
const reel_like_entity_1 = require("./entities/reel-like.entity");
const reel_save_entity_1 = require("./entities/reel-save.entity");
const reel_comment_entity_1 = require("./entities/reel-comment.entity");
const reel_creator_follow_entity_1 = require("./entities/reel-creator-follow.entity");
let ReelsService = class ReelsService {
    constructor(reelRepo, uploadSessionRepo, likeRepo, saveRepo, commentRepo, followRepo, jobRepo, userRepo, storage) {
        this.reelRepo = reelRepo;
        this.uploadSessionRepo = uploadSessionRepo;
        this.likeRepo = likeRepo;
        this.saveRepo = saveRepo;
        this.commentRepo = commentRepo;
        this.followRepo = followRepo;
        this.jobRepo = jobRepo;
        this.userRepo = userRepo;
        this.storage = storage;
    }
    onModuleInit() {
        this.cleanupExpiredUploadSessions().catch(() => undefined);
        this.cleanupTimer = setInterval(() => {
            this.cleanupExpiredUploadSessions().catch(() => undefined);
        }, 60 * 60 * 1000);
        this.cleanupTimer.unref?.();
    }
    async createReel(data, userId) {
        await this.cleanupExpiredUploadSessions();
        this.validateCreateMedia(data.media);
        if (data.linkedJobId) {
            const job = await this.jobRepo.findOne({
                where: { id: Number(data.linkedJobId), isActive: true },
            });
            if (!job) {
                throw new common_1.BadRequestException('Linked job does not exist or is not active');
            }
        }
        const reel = await this.reelRepo.save(this.reelRepo.create({
            creatorId: userId,
            caption: data.caption.trim(),
            category: data.category,
            audioTitle: data.audioTitle?.trim() || 'Original audio',
            linkedJobId: data.linkedJobId ? Number(data.linkedJobId) : null,
            visibility: data.visibility,
            allowComments: data.allowComments,
            allowSharing: data.allowSharing,
            originalFileName: data.media.fileName,
            contentType: data.media.contentType,
            fileSizeBytes: data.media.fileSizeBytes ?? null,
            durationSeconds: data.media.durationSeconds
                ? Math.ceil(Number(data.media.durationSeconds))
                : null,
            status: 'upload_pending',
        }));
        const uploadSession = await this.uploadSessionRepo.save(this.uploadSessionRepo.create({
            uploadId: (0, crypto_1.randomUUID)(),
            reelId: reel.id,
            userId,
            uploadKey: this.storage.createUploadKey(reel.id, data.media.fileName, data.media.contentType),
            storageProvider: 'local',
            status: 'pending',
            originalFileName: data.media.fileName,
            contentType: data.media.contentType,
            expectedFileSizeBytes: data.media.fileSizeBytes ?? null,
            durationSeconds: data.media.durationSeconds
                ? Math.ceil(Number(data.media.durationSeconds))
                : null,
            expiresAt: this.getUploadExpiry(),
        }));
        const createdReel = await this.getReelByIdOrThrow(reel.id);
        return {
            reel: await this.formatReel(createdReel, userId),
            upload: this.storage.getUploadInstructions(createdReel, uploadSession),
        };
    }
    async uploadLocalVideo(reelId, userId, uploadId, file) {
        if (!file) {
            throw new common_1.BadRequestException('No video file provided');
        }
        const { reel, session } = await this.getOwnedUploadSession(reelId, userId, uploadId);
        if (session.status !== 'pending') {
            await this.storage.deleteLocalFile(file.path);
            throw new common_1.BadRequestException('Upload session is not accepting files');
        }
        if (this.isExpired(session.expiresAt)) {
            await this.storage.deleteLocalFile(file.path);
            await this.markSessionExpired(session);
            throw new common_1.BadRequestException('Upload session has expired');
        }
        this.validateUploadedFile(file);
        const stored = await this.storage.commitLocalUpload(reel, session, file);
        await this.uploadSessionRepo.save({
            ...session,
            status: 'uploaded',
            uploadedFileName: stored.fileName,
            localFilePath: stored.localFilePath,
            publicUrl: stored.publicUrl,
            uploadedFileSizeBytes: file.size,
            uploadedContentType: file.mimetype,
        });
        return {
            uploadId: session.uploadId,
            reelId: String(reel.id),
            status: 'uploaded',
            fileName: stored.fileName,
            fileSizeBytes: file.size,
            contentType: file.mimetype,
        };
    }
    async completeUpload(reelId, userId, uploadId) {
        const { reel, session } = await this.getOwnedUploadSession(reelId, userId, uploadId);
        if (session.status === 'completed') {
            return this.formatReel(reel, userId);
        }
        if (session.status !== 'uploaded') {
            throw new common_1.BadRequestException('Upload has not completed');
        }
        if (this.isExpired(session.expiresAt)) {
            await this.markSessionExpired(session);
            throw new common_1.BadRequestException('Upload session has expired');
        }
        const now = new Date();
        const nextStatus = reel.visibility === 'draft' ? 'draft' : 'published';
        await this.reelRepo.save({
            ...reel,
            videoUrl: session.publicUrl,
            storageKey: session.uploadKey,
            contentType: session.uploadedContentType || session.contentType,
            fileSizeBytes: session.uploadedFileSizeBytes ?? session.expectedFileSizeBytes ?? null,
            durationSeconds: session.durationSeconds ?? reel.durationSeconds ?? null,
            status: nextStatus,
            processedAt: now,
            publishedAt: nextStatus === 'published' ? now : null,
        });
        await this.uploadSessionRepo.save({
            ...session,
            status: 'completed',
            completedAt: now,
        });
        return this.formatReel(await this.getReelByIdOrThrow(reel.id), userId);
    }
    async getFeed(query, userId) {
        const feed = query.feed || 'forYou';
        const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 20);
        const cursor = this.decodeCursor(query.cursor);
        const qb = this.reelRepo
            .createQueryBuilder('reel')
            .leftJoinAndSelect('reel.creator', 'creator')
            .where('reel.deletedAt IS NULL');
        if (feed === 'mine') {
            qb.andWhere('reel.creatorId = :userId', { userId });
        }
        else {
            qb.andWhere('reel.status = :publishedStatus', {
                publishedStatus: 'published',
            });
            if (feed === 'following') {
                qb.andWhere(`EXISTS (
            SELECT 1 FROM reel_creator_follows f
            WHERE f.creatorId = reel.creatorId AND f.followerId = :userId
          )`, { userId });
            }
            else {
                qb.andWhere(new typeorm_2.Brackets((visibilityQb) => {
                    visibilityQb.where('reel.visibility = :publicVisibility', {
                        publicVisibility: 'public',
                    });
                    visibilityQb.orWhere('reel.creatorId = :userId', { userId });
                    visibilityQb.orWhere(`(
                reel.visibility = :followersVisibility
                AND EXISTS (
                  SELECT 1 FROM reel_creator_follows f
                  WHERE f.creatorId = reel.creatorId AND f.followerId = :userId
                )
              )`, { followersVisibility: 'followers', userId });
                }));
            }
        }
        if (query.category) {
            qb.andWhere('reel.category = :category', { category: query.category });
        }
        if (cursor) {
            qb.andWhere(new typeorm_2.Brackets((cursorQb) => {
                cursorQb.where('reel.createdAt < :cursorCreatedAt', {
                    cursorCreatedAt: cursor.createdAt,
                });
                cursorQb.orWhere('reel.createdAt = :cursorCreatedAt AND reel.id < :cursorId', {
                    cursorCreatedAt: cursor.createdAt,
                    cursorId: cursor.id,
                });
            }));
        }
        const reels = await qb
            .orderBy('reel.createdAt', 'DESC')
            .addOrderBy('reel.id', 'DESC')
            .take(limit + 1)
            .getMany();
        const hasMore = reels.length > limit;
        const pageItems = hasMore ? reels.slice(0, limit) : reels;
        return {
            data: await this.formatReels(pageItems, userId),
            nextCursor: hasMore ? this.encodeCursor(pageItems[pageItems.length - 1]) : null,
        };
    }
    async getComments(reelId, userId, cursor, limit = 20) {
        await this.getViewableReelOrThrow(reelId, userId);
        const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
        const decodedCursor = this.decodeCursor(cursor);
        const qb = this.commentRepo
            .createQueryBuilder('comment')
            .leftJoinAndSelect('comment.user', 'user')
            .where('comment.reelId = :reelId', { reelId });
        if (decodedCursor) {
            qb.andWhere(new typeorm_2.Brackets((cursorQb) => {
                cursorQb.where('comment.createdAt < :cursorCreatedAt', {
                    cursorCreatedAt: decodedCursor.createdAt,
                });
                cursorQb.orWhere('comment.createdAt = :cursorCreatedAt AND comment.id < :cursorId', {
                    cursorCreatedAt: decodedCursor.createdAt,
                    cursorId: decodedCursor.id,
                });
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
            nextCursor: hasMore ? this.encodeCursor(pageItems[pageItems.length - 1]) : null,
        };
    }
    async addComment(reelId, userId, text) {
        const reel = await this.getViewableReelOrThrow(reelId, userId);
        if (!reel.allowComments) {
            throw new common_1.BadRequestException('Comments are disabled for this reel');
        }
        const comment = await this.commentRepo.save(this.commentRepo.create({
            reelId,
            userId,
            text: text.trim(),
        }));
        await this.incrementCounter(reelId, 'commentsCount');
        return this.formatComment(await this.commentRepo.findOne({
            where: { id: comment.id },
            relations: ['user'],
        }));
    }
    async likeReel(reelId, userId) {
        await this.getViewableReelOrThrow(reelId, userId);
        const existing = await this.likeRepo.findOne({ where: { reelId, userId } });
        if (!existing) {
            await this.likeRepo.save(this.likeRepo.create({ reelId, userId }));
            await this.incrementCounter(reelId, 'likesCount');
        }
        return this.formatReel(await this.getReelByIdOrThrow(reelId), userId);
    }
    async unlikeReel(reelId, userId) {
        const existing = await this.likeRepo.findOne({ where: { reelId, userId } });
        if (existing) {
            await this.likeRepo.delete(existing.id);
            await this.decrementCounter(reelId, 'likesCount');
        }
        return this.formatReel(await this.getReelByIdOrThrow(reelId), userId);
    }
    async saveReel(reelId, userId) {
        await this.getViewableReelOrThrow(reelId, userId);
        const existing = await this.saveRepo.findOne({ where: { reelId, userId } });
        if (!existing) {
            await this.saveRepo.save(this.saveRepo.create({ reelId, userId }));
            await this.incrementCounter(reelId, 'savesCount');
        }
        return this.formatReel(await this.getReelByIdOrThrow(reelId), userId);
    }
    async unsaveReel(reelId, userId) {
        const existing = await this.saveRepo.findOne({ where: { reelId, userId } });
        if (existing) {
            await this.saveRepo.delete(existing.id);
            await this.decrementCounter(reelId, 'savesCount');
        }
        return this.formatReel(await this.getReelByIdOrThrow(reelId), userId);
    }
    async registerShare(reelId, userId) {
        const reel = await this.getViewableReelOrThrow(reelId, userId);
        if (!reel.allowSharing) {
            throw new common_1.BadRequestException('Sharing is disabled for this reel');
        }
        await this.incrementCounter(reelId, 'sharesCount');
        return this.formatReel(await this.getReelByIdOrThrow(reelId), userId);
    }
    async followCreator(creatorId, followerId) {
        if (creatorId === followerId) {
            throw new common_1.BadRequestException('You cannot follow yourself');
        }
        const creator = await this.userRepo.findOne({ where: { id: creatorId } });
        if (!creator) {
            throw new common_1.NotFoundException('Creator not found');
        }
        const existing = await this.followRepo.findOne({
            where: { creatorId, followerId },
        });
        if (!existing) {
            await this.followRepo.save(this.followRepo.create({ creatorId, followerId }));
        }
        return { creatorId: String(creatorId), following: true };
    }
    async unfollowCreator(creatorId, followerId) {
        const existing = await this.followRepo.findOne({
            where: { creatorId, followerId },
        });
        if (existing) {
            await this.followRepo.delete(existing.id);
        }
        return { creatorId: String(creatorId), following: false };
    }
    async deleteReel(reelId, userId) {
        const reel = await this.getOwnedReelOrThrow(reelId, userId);
        reel.status = 'deleted';
        reel.deletedAt = new Date();
        await this.reelRepo.save(reel);
        return { id: String(reel.id), deleted: true };
    }
    async publishReel(reelId, userId) {
        const reel = await this.getOwnedReelOrThrow(reelId, userId);
        if (!reel.videoUrl) {
            throw new common_1.BadRequestException('Reel video must be uploaded before publishing');
        }
        const now = new Date();
        reel.status = 'published';
        reel.visibility = 'public';
        reel.publishedAt = reel.publishedAt || now;
        reel.processedAt = reel.processedAt || now;
        await this.reelRepo.save(reel);
        return this.formatReel(await this.getReelByIdOrThrow(reelId), userId);
    }
    async cleanupExpiredUploadSessions() {
        const expiredSessions = await this.uploadSessionRepo
            .createQueryBuilder('session')
            .where('session.expiresAt < :now', { now: new Date() })
            .andWhere('session.status IN (:...statuses)', {
            statuses: ['pending', 'uploaded'],
        })
            .take(50)
            .getMany();
        for (const session of expiredSessions) {
            await this.markSessionExpired(session);
        }
    }
    validateCreateMedia(media) {
        if (!(0, reel_storage_service_1.isAllowedReelMimeType)(media.contentType)) {
            throw new common_1.BadRequestException('Unsupported reel video type');
        }
        if (!(0, reel_storage_service_1.isAllowedReelFileName)(media.fileName)) {
            throw new common_1.BadRequestException('Unsupported reel video file extension');
        }
        if (media.fileSizeBytes && media.fileSizeBytes > (0, reel_storage_service_1.getReelMaxFileSizeBytes)()) {
            throw new common_1.BadRequestException('Reel video exceeds the maximum file size');
        }
        if (media.durationSeconds && Number(media.durationSeconds) > 60) {
            throw new common_1.BadRequestException('Reel video must be 60 seconds or shorter');
        }
    }
    validateUploadedFile(file) {
        if (!(0, reel_storage_service_1.isAllowedReelMimeType)(file.mimetype)) {
            throw new common_1.BadRequestException('Unsupported reel video type');
        }
        if (!(0, reel_storage_service_1.isAllowedReelFileName)(file.originalname)) {
            throw new common_1.BadRequestException('Unsupported reel video file extension');
        }
        if (file.size > (0, reel_storage_service_1.getReelMaxFileSizeBytes)()) {
            throw new common_1.BadRequestException('Reel video exceeds the maximum file size');
        }
    }
    async getOwnedUploadSession(reelId, userId, uploadId) {
        const reel = await this.getOwnedReelOrThrow(reelId, userId);
        const session = await this.uploadSessionRepo.findOne({
            where: { reelId, userId, uploadId },
        });
        if (!session) {
            throw new common_1.NotFoundException('Upload session not found');
        }
        return { reel, session };
    }
    async getOwnedReelOrThrow(reelId, userId) {
        const reel = await this.getReelByIdOrThrow(reelId);
        if (reel.creatorId !== userId) {
            throw new common_1.ForbiddenException('You are not allowed to modify this reel');
        }
        return reel;
    }
    async getViewableReelOrThrow(reelId, userId) {
        const reel = await this.getReelByIdOrThrow(reelId);
        if (reel.status !== 'published' && reel.creatorId !== userId) {
            throw new common_1.NotFoundException('Reel not found');
        }
        if (reel.visibility === 'draft' && reel.creatorId !== userId) {
            throw new common_1.NotFoundException('Reel not found');
        }
        if (reel.visibility === 'followers' && reel.creatorId !== userId) {
            const follows = await this.followRepo.findOne({
                where: { creatorId: reel.creatorId, followerId: userId },
            });
            if (!follows) {
                throw new common_1.NotFoundException('Reel not found');
            }
        }
        return reel;
    }
    async getReelByIdOrThrow(reelId) {
        const reel = await this.reelRepo.findOne({
            where: { id: reelId },
            relations: ['creator', 'linkedJob'],
        });
        if (!reel || reel.status === 'deleted' || reel.deletedAt) {
            throw new common_1.NotFoundException('Reel not found');
        }
        return reel;
    }
    async formatReels(reels, viewerId) {
        if (!reels.length) {
            return [];
        }
        const reelIds = reels.map((reel) => reel.id);
        const creatorIds = Array.from(new Set(reels.map((reel) => reel.creatorId)));
        const [likes, saves, follows] = await Promise.all([
            this.likeRepo.find({ where: { userId: viewerId, reelId: (0, typeorm_2.In)(reelIds) } }),
            this.saveRepo.find({ where: { userId: viewerId, reelId: (0, typeorm_2.In)(reelIds) } }),
            this.followRepo.find({
                where: { followerId: viewerId, creatorId: (0, typeorm_2.In)(creatorIds) },
            }),
        ]);
        const likedIds = new Set(likes.map((like) => like.reelId));
        const savedIds = new Set(saves.map((save) => save.reelId));
        const followedCreatorIds = new Set(follows.map((follow) => follow.creatorId));
        return reels.map((reel) => this.formatReelSync(reel, viewerId, likedIds, savedIds, followedCreatorIds));
    }
    async getReelAudio(reelId, viewerId) {
        const reel = await this.getViewableReelOrThrow(reelId, viewerId);
        const audioTitle = reel.audioTitle || 'Original audio';
        const usageCount = await this.reelRepo.count({
            where: {
                audioTitle,
                status: 'published',
            },
        });
        return {
            audioId: encodeURIComponent(audioTitle),
            audioTitle,
            creator: this.formatAuthor(reel.creator),
            originalReel: this.formatReelSync(reel, viewerId, new Set(), new Set(), new Set()),
            usageCount,
        };
    }
    async getReelsByAudio(audioId, viewerId, query = {}) {
        const audioTitle = decodeURIComponent(audioId);
        const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
        const page = Math.max(1, Number(query.page) || 1);
        const [reels, total] = await this.reelRepo.findAndCount({
            where: {
                audioTitle,
                status: 'published',
            },
            relations: ['creator', 'linkedJob'],
            order: { publishedAt: 'DESC', createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return {
            audioId: encodeURIComponent(audioTitle),
            audioTitle,
            usageCount: total,
            relatedReels: await this.formatReels(reels, viewerId),
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
        };
    }
    async formatReel(reel, viewerId) {
        const [like, save, follow] = await Promise.all([
            this.likeRepo.findOne({ where: { reelId: reel.id, userId: viewerId } }),
            this.saveRepo.findOne({ where: { reelId: reel.id, userId: viewerId } }),
            this.followRepo.findOne({
                where: { creatorId: reel.creatorId, followerId: viewerId },
            }),
        ]);
        return this.formatReelSync(reel, viewerId, new Set(like ? [reel.id] : []), new Set(save ? [reel.id] : []), new Set(follow ? [reel.creatorId] : []));
    }
    formatReelSync(reel, viewerId, likedIds, savedIds, followedCreatorIds) {
        return {
            id: String(reel.id),
            videoUrl: reel.videoUrl,
            category: reel.category,
            author: this.formatAuthor(reel.creator),
            caption: reel.caption,
            audioTitle: reel.audioTitle,
            linkedJobId: reel.linkedJobId || undefined,
            stats: {
                likes: reel.likesCount || 0,
                comments: reel.commentsCount || 0,
                saves: reel.savesCount || 0,
                shares: reel.sharesCount || 0,
            },
            viewerState: {
                liked: likedIds.has(reel.id),
                saved: savedIds.has(reel.id),
                followingCreator: followedCreatorIds.has(reel.creatorId),
                isOwner: reel.creatorId === viewerId,
            },
            visibility: reel.visibility,
            status: reel.status,
            allowComments: reel.allowComments,
            allowSharing: reel.allowSharing,
            createdAt: reel.createdAt,
            publishedAt: reel.publishedAt,
        };
    }
    formatComment(comment) {
        if (!comment) {
            return null;
        }
        return {
            id: String(comment.id),
            reelId: String(comment.reelId),
            author: this.formatAuthor(comment.user),
            text: comment.text,
            createdAt: comment.createdAt,
        };
    }
    formatAuthor(user) {
        const name = user?.full_name ||
            [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
            'Jadeed user';
        const handleBase = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 28);
        return {
            id: user?.id ? String(user.id) : undefined,
            name,
            handle: `@${handleBase || `user_${user?.id || 'unknown'}`}`,
            avatarUri: user?.profile_photo ||
                `https://i.pravatar.cc/160?u=jadeed-${user?.id || 'anonymous'}`,
            verified: Boolean(user?.isVerified),
        };
    }
    getUploadExpiry() {
        return new Date(Date.now() + (0, reel_storage_service_1.getReelUploadTtlMinutes)() * 60 * 1000);
    }
    isExpired(expiresAt) {
        return new Date(expiresAt).getTime() <= Date.now();
    }
    async markSessionExpired(session) {
        session.status = 'expired';
        session.errorMessage = 'Upload session expired';
        await this.uploadSessionRepo.save(session);
        await this.storage.deleteLocalFile(session.localFilePath);
        const reel = await this.reelRepo.findOne({ where: { id: session.reelId } });
        if (reel?.status === 'upload_pending') {
            reel.status = 'failed';
            await this.reelRepo.save(reel);
        }
    }
    async incrementCounter(reelId, field) {
        await this.reelRepo.increment({ id: reelId }, field, 1);
    }
    async decrementCounter(reelId, field) {
        await this.reelRepo
            .createQueryBuilder()
            .update(reel_entity_1.Reel)
            .set({ [field]: () => `GREATEST(${field} - 1, 0)` })
            .where('id = :reelId', { reelId })
            .execute();
    }
    encodeCursor(item) {
        return Buffer.from(JSON.stringify({
            id: item.id,
            createdAt: item.createdAt.toISOString(),
        })).toString('base64');
    }
    decodeCursor(cursor) {
        if (!cursor) {
            return null;
        }
        try {
            const parsed = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
            const id = Number(parsed.id);
            const createdAt = new Date(parsed.createdAt);
            if (!Number.isFinite(id) || Number.isNaN(createdAt.getTime())) {
                return null;
            }
            return { id, createdAt };
        }
        catch {
            return null;
        }
    }
};
exports.ReelsService = ReelsService;
exports.ReelsService = ReelsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(reel_entity_1.Reel)),
    __param(1, (0, typeorm_1.InjectRepository)(reel_upload_session_entity_1.ReelUploadSession)),
    __param(2, (0, typeorm_1.InjectRepository)(reel_like_entity_1.ReelLike)),
    __param(3, (0, typeorm_1.InjectRepository)(reel_save_entity_1.ReelSave)),
    __param(4, (0, typeorm_1.InjectRepository)(reel_comment_entity_1.ReelComment)),
    __param(5, (0, typeorm_1.InjectRepository)(reel_creator_follow_entity_1.ReelCreatorFollow)),
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
        reel_storage_service_1.ReelStorageService])
], ReelsService);
//# sourceMappingURL=reels.service.js.map