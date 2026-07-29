import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository, SelectQueryBuilder } from 'typeorm';
import { randomUUID } from 'crypto';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import {
  getReelMaxFileSizeBytes,
  getReelUploadTtlMinutes,
  isAllowedReelFileName,
  isAllowedReelMimeType,
  ReelStorageService,
} from './reel-storage.service';
import {
  Reel,
  ReelCategory,
  ReelPublisherType,
  ReelVisibility,
} from './entities/reel.entity';
import { ReelUploadSession } from './entities/reel-upload-session.entity';
import { ReelLike } from './entities/reel-like.entity';
import { ReelSave } from './entities/reel-save.entity';
import { ReelComment } from './entities/reel-comment.entity';
import { ProfileFollow } from 'src/profiles/entities/profile-follow.entity';
import { PagesService } from 'src/pages/pages.service';
import { ProfilesService } from 'src/profiles/profiles.service';
import {
  formatCompanyPublisher,
  formatUserPublisher,
} from 'src/profiles/profile-format.util';
import { ModerationService } from 'src/moderation/moderation.service';
import { ObjectStorageService } from 'src/storage/object-storage.service';

type CreateReelPayload = {
  caption: string;
  category: ReelCategory;
  audioTitle?: string;
  linkedJobId?: number;
  visibility: ReelVisibility;
  allowComments: boolean;
  allowSharing: boolean;
  publisher?:
    | { type: 'user' }
    | { type: 'company'; id: number };
  media: {
    fileName: string;
    contentType: string;
    fileSizeBytes?: number;
    durationSeconds?: number;
  };
};

type FeedQuery = {
  feed?: 'forYou' | 'following' | 'mine';
  category?: ReelCategory;
  cursor?: string;
  limit?: number;
  publisherType?: ReelPublisherType;
  publisherId?: number;
};

@Injectable()
export class ReelsService implements OnModuleInit {
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(Reel)
    private readonly reelRepo: Repository<Reel>,

    @InjectRepository(ReelUploadSession)
    private readonly uploadSessionRepo: Repository<ReelUploadSession>,

    @InjectRepository(ReelLike)
    private readonly likeRepo: Repository<ReelLike>,

    @InjectRepository(ReelSave)
    private readonly saveRepo: Repository<ReelSave>,

    @InjectRepository(ReelComment)
    private readonly commentRepo: Repository<ReelComment>,

    @InjectRepository(ProfileFollow)
    private readonly profileFollowRepo: Repository<ProfileFollow>,

    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly pagesService: PagesService,

    private readonly profilesService: ProfilesService,

    private readonly storage: ReelStorageService,
    private readonly moderationService: ModerationService,
    private readonly objectStorageService: ObjectStorageService,
  ) {}

  onModuleInit() {
    this.cleanupExpiredUploadSessions().catch(() => undefined);

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredUploadSessions().catch(() => undefined);
    }, 60 * 60 * 1000);

    this.cleanupTimer.unref?.();
  }

  getPublisherOptions(userId: number) {
    return this.pagesService.getReelPublisherOptions(userId);
  }

  async createReel(data: CreateReelPayload, userId: number) {
    await this.cleanupExpiredUploadSessions();
    this.validateCreateMedia(data.media);
    const publisher = await this.resolvePublisher(data.publisher, userId);
    await this.validateLinkedJob(
      data.linkedJobId,
      userId,
      publisher.type,
      publisher.companyId,
    );

    const reel = await this.reelRepo.save(
      this.reelRepo.create({
        creatorId: userId,
        publisherType: publisher.type,
        publisherCompanyId: publisher.companyId,
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
      }),
    );

    const uploadSession = await this.uploadSessionRepo.save(
      this.uploadSessionRepo.create({
        uploadId: randomUUID(),
        reelId: reel.id,
        userId,
        uploadKey: this.storage.createUploadKey(
          reel.id,
          data.media.fileName,
          data.media.contentType,
        ),
        storageProvider: 'local',
        status: 'pending',
        originalFileName: data.media.fileName,
        contentType: data.media.contentType,
        expectedFileSizeBytes: data.media.fileSizeBytes ?? null,
        durationSeconds: data.media.durationSeconds
          ? Math.ceil(Number(data.media.durationSeconds))
          : null,
        expiresAt: this.getUploadExpiry(),
      }),
    );

    const createdReel = await this.getReelByIdOrThrow(reel.id);

    return {
      reel: await this.formatReel(createdReel, userId),
      upload: this.storage.getUploadInstructions(createdReel, uploadSession),
    };
  }

  async uploadLocalVideo(
    reelId: number,
    userId: number,
    uploadId: string,
    file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No video file provided');
    }

    const { reel, session } = await this.getOwnedUploadSession(
      reelId,
      userId,
      uploadId,
    );

    if (session.status !== 'pending') {
      await this.storage.deleteLocalFile(file.path);
      throw new BadRequestException('Upload session is not accepting files');
    }

    if (this.isExpired(session.expiresAt)) {
      await this.storage.deleteLocalFile(file.path);
      await this.markSessionExpired(session);
      throw new BadRequestException('Upload session has expired');
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

  async completeUpload(reelId: number, userId: number, uploadId: string) {
    const { reel, session } = await this.getOwnedUploadSession(
      reelId,
      userId,
      uploadId,
    );

    if (session.status === 'completed') {
      return this.formatReel(reel, userId);
    }

    if (session.status !== 'uploaded') {
      throw new BadRequestException('Upload has not completed');
    }

    if (this.isExpired(session.expiresAt)) {
      await this.markSessionExpired(session);
      throw new BadRequestException('Upload session has expired');
    }

    await this.assertPublisherCanPublish(reel, userId);
    await this.validateLinkedJob(
      reel.linkedJobId,
      userId,
      this.getPublisherType(reel),
      reel.publisherCompanyId,
    );

    const now = new Date();
    const nextStatus = reel.visibility === 'draft' ? 'draft' : 'published';

    await this.reelRepo.save({
      ...reel,
      videoUrl: session.publicUrl,
      storageKey: session.uploadKey,
      contentType: session.uploadedContentType || session.contentType,
      fileSizeBytes:
        session.uploadedFileSizeBytes ?? session.expectedFileSizeBytes ?? null,
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

  async getFeed(query: FeedQuery, userId: number) {
    const feed = query.feed || 'forYou';
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 20);
    const cursor = this.decodeCursor(query.cursor);

    const qb = this.reelRepo
      .createQueryBuilder('reel')
      .leftJoinAndSelect('reel.creator', 'creator')
      .leftJoinAndSelect('reel.publisherCompany', 'publisherCompany')
      .where('reel.deletedAt IS NULL');

    if (feed === 'mine') {
      qb.andWhere('reel.creatorId = :userId', { userId });
    } else {
      qb.andWhere('reel.status = :publishedStatus', {
        publishedStatus: 'published',
      });
      qb.andWhere(
        `(
          COALESCE(reel.publisherType, 'user') = 'user'
          OR publisherCompany.verificationStatus = 'approved'
        )`,
      );
      qb.andWhere('creator.isBanned = :creatorBanned', {
        creatorBanned: false,
      });
      qb.andWhere('creator.deletedAt IS NULL');
      await this.applyBlockedPublisherFilters(qb, userId);

      if (feed === 'following') {
        qb.andWhere(this.publisherFollowExistsSql('reel'), { userId });
      } else {
        qb.andWhere(
          new Brackets((visibilityQb) => {
            visibilityQb.where('reel.visibility = :publicVisibility', {
              publicVisibility: 'public',
            });
            visibilityQb.orWhere('reel.creatorId = :userId', { userId });
            visibilityQb.orWhere(
              `(
                reel.visibility = :followersVisibility
                AND ${this.publisherFollowExistsSql('reel')}
              )`,
              { followersVisibility: 'followers', userId },
            );
          }),
        );
      }
    }

    if (query.category) {
      qb.andWhere('reel.category = :category', { category: query.category });
    }

    if (query.publisherType && query.publisherId) {
      if (query.publisherType === 'company') {
        qb.andWhere('reel.publisherType = :publisherType', {
          publisherType: 'company',
        });
        qb.andWhere('reel.publisherCompanyId = :publisherId', {
          publisherId: Number(query.publisherId),
        });
      } else {
        qb.andWhere("COALESCE(reel.publisherType, 'user') = :publisherType", {
          publisherType: 'user',
        });
        qb.andWhere('reel.creatorId = :publisherId', {
          publisherId: Number(query.publisherId),
        });
      }
    }

    if (cursor) {
      qb.andWhere(
        new Brackets((cursorQb) => {
          cursorQb.where('reel.createdAt < :cursorCreatedAt', {
            cursorCreatedAt: cursor.createdAt,
          });
          cursorQb.orWhere(
            'reel.createdAt = :cursorCreatedAt AND reel.id < :cursorId',
            {
              cursorCreatedAt: cursor.createdAt,
              cursorId: cursor.id,
            },
          );
        }),
      );
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

  async getComments(reelId: number, userId: number, cursor?: string, limit = 20) {
    await this.getViewableReelOrThrow(reelId, userId);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const decodedCursor = this.decodeCursor(cursor);

    const qb = this.commentRepo
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .where('comment.reelId = :reelId', { reelId });

    if (decodedCursor) {
      qb.andWhere(
        new Brackets((cursorQb) => {
          cursorQb.where('comment.createdAt < :cursorCreatedAt', {
            cursorCreatedAt: decodedCursor.createdAt,
          });
          cursorQb.orWhere(
            'comment.createdAt = :cursorCreatedAt AND comment.id < :cursorId',
            {
              cursorCreatedAt: decodedCursor.createdAt,
              cursorId: decodedCursor.id,
            },
          );
        }),
      );
    }

    const comments = await qb
      .orderBy('comment.createdAt', 'DESC')
      .addOrderBy('comment.id', 'DESC')
      .take(safeLimit + 1)
      .getMany();

    const hasMore = comments.length > safeLimit;
    const pageItems = hasMore ? comments.slice(0, safeLimit) : comments;

    return {
      data: await Promise.all(
        pageItems.map((comment) => this.formatComment(comment)),
      ),
      nextCursor: hasMore ? this.encodeCursor(pageItems[pageItems.length - 1]) : null,
    };
  }

  async addComment(reelId: number, userId: number, text: string) {
    const reel = await this.getViewableReelOrThrow(reelId, userId);

    if (!reel.allowComments) {
      throw new BadRequestException('Comments are disabled for this reel');
    }

    const comment = await this.commentRepo.save(
      this.commentRepo.create({
        reelId,
        userId,
        text: text.trim(),
      }),
    );

    await this.incrementCounter(reelId, 'commentsCount');

    return this.formatComment(
      await this.commentRepo.findOne({
        where: { id: comment.id },
        relations: ['user'],
      }),
    );
  }

  async likeReel(reelId: number, userId: number) {
    await this.getViewableReelOrThrow(reelId, userId);
    const existing = await this.likeRepo.findOne({ where: { reelId, userId } });

    if (!existing) {
      await this.likeRepo.save(this.likeRepo.create({ reelId, userId }));
      await this.incrementCounter(reelId, 'likesCount');
    }

    return this.formatReel(await this.getReelByIdOrThrow(reelId), userId);
  }

  async unlikeReel(reelId: number, userId: number) {
    await this.getViewableReelOrThrow(reelId, userId);
    const existing = await this.likeRepo.findOne({ where: { reelId, userId } });

    if (existing) {
      await this.likeRepo.delete(existing.id);
      await this.decrementCounter(reelId, 'likesCount');
    }

    return this.formatReel(await this.getReelByIdOrThrow(reelId), userId);
  }

  async saveReel(reelId: number, userId: number) {
    await this.getViewableReelOrThrow(reelId, userId);
    const existing = await this.saveRepo.findOne({ where: { reelId, userId } });

    if (!existing) {
      await this.saveRepo.save(this.saveRepo.create({ reelId, userId }));
      await this.incrementCounter(reelId, 'savesCount');
    }

    return this.formatReel(await this.getReelByIdOrThrow(reelId), userId);
  }

  async unsaveReel(reelId: number, userId: number) {
    await this.getViewableReelOrThrow(reelId, userId);
    const existing = await this.saveRepo.findOne({ where: { reelId, userId } });

    if (existing) {
      await this.saveRepo.delete(existing.id);
      await this.decrementCounter(reelId, 'savesCount');
    }

    return this.formatReel(await this.getReelByIdOrThrow(reelId), userId);
  }

  async registerShare(reelId: number, userId: number) {
    const reel = await this.getViewableReelOrThrow(reelId, userId);

    if (!reel.allowSharing) {
      throw new BadRequestException('Sharing is disabled for this reel');
    }

    await this.incrementCounter(reelId, 'sharesCount');

    return this.formatReel(await this.getReelByIdOrThrow(reelId), userId);
  }

  async followCreator(creatorId: number, followerId: number) {
    const result = await this.profilesService.follow(
      'user',
      creatorId,
      followerId,
    );
    return { ...result, creatorId: String(creatorId) };
  }

  async unfollowCreator(creatorId: number, followerId: number) {
    const result = await this.profilesService.unfollow(
      'user',
      creatorId,
      followerId,
    );
    return { ...result, creatorId: String(creatorId) };
  }

  async deleteReel(reelId: number, userId: number) {
    const reel = await this.getOwnedReelOrThrow(reelId, userId);
    reel.status = 'deleted';
    reel.deletedAt = new Date();
    await this.reelRepo.save(reel);
    return { id: String(reel.id), deleted: true };
  }

  async publishReel(reelId: number, userId: number) {
    const reel = await this.getOwnedReelOrThrow(reelId, userId);

    if (!reel.videoUrl) {
      throw new BadRequestException('Reel video must be uploaded before publishing');
    }

    await this.assertPublisherCanPublish(reel, userId);
    await this.validateLinkedJob(
      reel.linkedJobId,
      userId,
      this.getPublisherType(reel),
      reel.publisherCompanyId,
    );

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

  private validateCreateMedia(media: CreateReelPayload['media']) {
    if (!isAllowedReelMimeType(media.contentType)) {
      throw new BadRequestException('Unsupported reel video type');
    }

    if (!isAllowedReelFileName(media.fileName)) {
      throw new BadRequestException('Unsupported reel video file extension');
    }

    if (media.fileSizeBytes && media.fileSizeBytes > getReelMaxFileSizeBytes()) {
      throw new BadRequestException('Reel video exceeds the maximum file size');
    }

    if (media.durationSeconds && Number(media.durationSeconds) > 60) {
      throw new BadRequestException('Reel video must be 60 seconds or shorter');
    }
  }

  private validateUploadedFile(file: Express.Multer.File) {
    if (!isAllowedReelMimeType(file.mimetype)) {
      throw new BadRequestException('Unsupported reel video type');
    }

    if (!isAllowedReelFileName(file.originalname)) {
      throw new BadRequestException('Unsupported reel video file extension');
    }

    if (file.size > getReelMaxFileSizeBytes()) {
      throw new BadRequestException('Reel video exceeds the maximum file size');
    }
  }

  private async getOwnedUploadSession(
    reelId: number,
    userId: number,
    uploadId: string,
  ) {
    const reel = await this.getOwnedReelOrThrow(reelId, userId);
    const session = await this.uploadSessionRepo.findOne({
      where: { reelId, userId, uploadId },
    });

    if (!session) {
      throw new NotFoundException('Upload session not found');
    }

    return { reel, session };
  }

  private async getOwnedReelOrThrow(reelId: number, userId: number) {
    const reel = await this.getReelByIdOrThrow(reelId);

    if (reel.creatorId !== userId) {
      throw new ForbiddenException('You are not allowed to modify this reel');
    }

    return reel;
  }

  private async getViewableReelOrThrow(reelId: number, userId: number) {
    const reel = await this.getReelByIdOrThrow(reelId);

    if (reel.status !== 'published' && reel.creatorId !== userId) {
      throw new NotFoundException('Reel not found');
    }

    if (reel.visibility === 'draft' && reel.creatorId !== userId) {
      throw new NotFoundException('Reel not found');
    }
    if (
      reel.creatorId !== userId &&
      (reel.creator?.isBanned || reel.creator?.deletedAt)
    ) {
      throw new NotFoundException('Reel not found');
    }
    if (reel.creatorId !== userId) {
      await this.moderationService.assertInteractionAllowed(
        userId,
        this.getPublisherType(reel),
        this.getPublisherId(reel),
      );
    }

    if (
      this.getPublisherType(reel) === 'company' &&
      reel.publisherCompany?.verificationStatus !== 'approved' &&
      reel.creatorId !== userId
    ) {
      throw new NotFoundException('Reel not found');
    }

    if (reel.visibility === 'followers' && reel.creatorId !== userId) {
      const follows = await this.profileFollowRepo.findOne({
        where: {
          followerUserId: userId,
          profileType: this.getPublisherType(reel),
          profileId: this.getPublisherId(reel),
        },
      });

      if (!follows) {
        throw new NotFoundException('Reel not found');
      }
    }

    return reel;
  }

  private async getReelByIdOrThrow(reelId: number) {
    const reel = await this.reelRepo.findOne({
      where: { id: reelId },
      relations: ['creator', 'linkedJob', 'publisherCompany'],
    });

    if (!reel || reel.status === 'deleted' || reel.deletedAt) {
      throw new NotFoundException('Reel not found');
    }

    return reel;
  }

  private async formatReels(reels: Reel[], viewerId: number) {
    if (!reels.length) {
      return [];
    }

    const reelIds = reels.map((reel) => reel.id);
    const userPublisherIds = Array.from(
      new Set(
        reels
          .filter((reel) => this.getPublisherType(reel) === 'user')
          .map((reel) => reel.creatorId),
      ),
    );
    const companyPublisherIds = Array.from(
      new Set(
        reels
          .filter((reel) => this.getPublisherType(reel) === 'company')
          .map((reel) => reel.publisherCompanyId)
          .filter(Boolean),
      ),
    );

    const [likes, saves, userFollows, companyFollows] = await Promise.all([
      this.likeRepo.find({ where: { userId: viewerId, reelId: In(reelIds) } }),
      this.saveRepo.find({ where: { userId: viewerId, reelId: In(reelIds) } }),
      userPublisherIds.length
        ? this.profileFollowRepo.find({
            where: {
              followerUserId: viewerId,
              profileType: 'user',
              profileId: In(userPublisherIds),
            },
          })
        : Promise.resolve([]),
      companyPublisherIds.length
        ? this.profileFollowRepo.find({
            where: {
              followerUserId: viewerId,
              profileType: 'company',
              profileId: In(companyPublisherIds),
            },
          })
        : Promise.resolve([]),
    ]);

    const likedIds = new Set(likes.map((like) => like.reelId));
    const savedIds = new Set(saves.map((save) => save.reelId));
    const followedPublisherKeys = new Set(
      [...userFollows, ...companyFollows].map((follow) =>
        this.publisherKey(follow.profileType, follow.profileId),
      ),
    );

    return Promise.all(
      reels.map(async (reel) =>
        this.withPublisherAsset(
          this.formatReelSync(
            reel,
            viewerId,
            likedIds,
            savedIds,
            followedPublisherKeys,
          ),
          reel,
        ),
      ),
    );
  }

  async getReelAudio(reelId: number, viewerId: number) {
    const reel = await this.getViewableReelOrThrow(reelId, viewerId);
    const audioTitle = reel.audioTitle || 'Original audio';
    const usageQuery = this.createViewablePublishedQuery(viewerId);
    await this.applyBlockedPublisherFilters(usageQuery, viewerId);
    const usageCount = await usageQuery
      .andWhere('reel.audioTitle = :audioTitle', { audioTitle })
      .getCount();
    const publisher = await this.publisherWithAsset(reel);

    return {
      audioId: encodeURIComponent(audioTitle),
      audioTitle,
      publisher,
      creator: publisher,
      originalReel: await this.formatReel(reel, viewerId),
      usageCount,
    };
  }

  async getReelsByAudio(audioId: string, viewerId: number, query: any = {}) {
    const audioTitle = decodeURIComponent(audioId);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const page = Math.max(1, Number(query.page) || 1);

    const qb = this.createViewablePublishedQuery(viewerId);
    await this.applyBlockedPublisherFilters(qb, viewerId);
    const [reels, total] = await qb
      .leftJoinAndSelect('reel.linkedJob', 'linkedJob')
      .andWhere('reel.audioTitle = :audioTitle', { audioTitle })
      .orderBy('reel.publishedAt', 'DESC')
      .addOrderBy('reel.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

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

  private async formatReel(reel: Reel, viewerId: number) {
    const [like, save, follow] = await Promise.all([
      this.likeRepo.findOne({ where: { reelId: reel.id, userId: viewerId } }),
      this.saveRepo.findOne({ where: { reelId: reel.id, userId: viewerId } }),
      this.profileFollowRepo.findOne({
        where: {
          followerUserId: viewerId,
          profileType: this.getPublisherType(reel),
          profileId: this.getPublisherId(reel),
        },
      }),
    ]);

    return this.withPublisherAsset(
      this.formatReelSync(
        reel,
        viewerId,
        new Set(like ? [reel.id] : []),
        new Set(save ? [reel.id] : []),
        new Set(
          follow
            ? [this.publisherKey(follow.profileType, follow.profileId)]
            : [],
        ),
      ),
      reel,
    );
  }

  private formatReelSync(
    reel: Reel,
    viewerId: number,
    likedIds: Set<number>,
    savedIds: Set<number>,
    followedPublisherKeys: Set<string>,
  ) {
    const publisherType = this.getPublisherType(reel);
    const publisherId = this.getPublisherId(reel);
    const publisher = this.formatPublisher(reel);
    const followingPublisher = followedPublisherKeys.has(
      this.publisherKey(publisherType, publisherId),
    );

    return {
      id: String(reel.id),
      videoUrl: reel.videoUrl,
      category: reel.category,
      publisher,
      author: publisher,
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
        followingPublisher,
        followingCreator: followingPublisher,
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

  private async formatComment(comment: ReelComment | null) {
    if (!comment) {
      return null;
    }

    return {
      id: String(comment.id),
      reelId: String(comment.reelId),
      author: await this.formatAuthor(comment.user),
      text: comment.text,
      createdAt: comment.createdAt,
    };
  }

  private async formatAuthor(user?: User) {
    const author = formatUserPublisher(user);
    return {
      ...author,
      avatarUri:
        (user?.profilePhotoAssetId
          ? await this.storageAssetUrl(user.profilePhotoAssetId)
          : author.avatarUri) ||
        `https://i.pravatar.cc/160?u=jadeed-${user?.id || 'anonymous'}`,
    };
  }

  private async publisherWithAsset(reel: Reel) {
    const publisher = this.formatPublisher(reel);
    const assetId =
      this.getPublisherType(reel) === 'company'
        ? reel.publisherCompany?.logoAssetId
        : reel.creator?.profilePhotoAssetId;
    return assetId
      ? { ...publisher, avatarUri: await this.storageAssetUrl(assetId) }
      : publisher;
  }

  private async withPublisherAsset(result: any, reel: Reel) {
    const publisher = await this.publisherWithAsset(reel);
    return { ...result, publisher, author: publisher };
  }

  private async storageAssetUrl(assetId: string) {
    return this.objectStorageService.getUrl(assetId);
  }

  private async resolvePublisher(
    publisher: CreateReelPayload['publisher'],
    userId: number,
  ) {
    if (!publisher || publisher.type === 'user') {
      return { type: 'user' as const, companyId: null };
    }

    if (publisher.type !== 'company') {
      throw new BadRequestException('Invalid reel publisher');
    }

    const companyId = Number(publisher.id);
    if (!Number.isInteger(companyId) || companyId <= 0) {
      throw new BadRequestException('Invalid company publisher');
    }

    await this.pagesService.assertCompanyCanPublish(companyId, userId);
    return { type: 'company' as const, companyId };
  }

  private async assertPublisherCanPublish(reel: Reel, userId: number) {
    if (this.getPublisherType(reel) !== 'company') return;
    if (!reel.publisherCompanyId) {
      throw new BadRequestException('Company publisher is missing');
    }

    await this.pagesService.assertCompanyCanPublish(
      reel.publisherCompanyId,
      userId,
    );
  }

  private async validateLinkedJob(
    linkedJobId: number | null | undefined,
    userId: number,
    publisherType: ReelPublisherType,
    publisherCompanyId?: number | null,
  ) {
    if (!linkedJobId) return;

    const job = await this.jobRepo.findOne({
      where: { id: Number(linkedJobId) },
    });
    const active = job?.isActive && (!job.status || job.status === 'active');
    if (!job || !active) {
      throw new BadRequestException('Linked job does not exist or is not active');
    }

    if (publisherType === 'company') {
      if (!publisherCompanyId || job.pageId !== publisherCompanyId) {
        throw new BadRequestException(
          'Linked job does not belong to the selected company',
        );
      }
      return;
    }

    if (job.createdBy !== userId) {
      throw new BadRequestException('Linked job was not created by this user');
    }
  }

  private getPublisherType(reel: Reel): ReelPublisherType {
    return reel.publisherType === 'company' ? 'company' : 'user';
  }

  private getPublisherId(reel: Reel) {
    return this.getPublisherType(reel) === 'company'
      ? Number(reel.publisherCompanyId)
      : Number(reel.creatorId);
  }

  private publisherKey(type: ReelPublisherType, id: number) {
    return `${type}:${id}`;
  }

  private formatPublisher(reel: Reel) {
    if (this.getPublisherType(reel) === 'company') {
      const publisher = formatCompanyPublisher(reel.publisherCompany);
      return {
        ...publisher,
        id: String(reel.publisherCompanyId),
        avatarUri: publisher.avatarUri || '',
      };
    }

    const publisher = formatUserPublisher(reel.creator);
    return {
      ...publisher,
      id: String(reel.creatorId),
      avatarUri:
        publisher.avatarUri ||
        `https://i.pravatar.cc/160?u=jadeed-${reel.creatorId}`,
    };
  }

  private publisherFollowExistsSql(reelAlias: string) {
    return `EXISTS (
      SELECT 1 FROM profile_follows pf
      WHERE pf.followerUserId = :userId
        AND (
          (
            pf.profileType = 'user'
            AND COALESCE(${reelAlias}.publisherType, 'user') = 'user'
            AND pf.profileId = ${reelAlias}.creatorId
          )
          OR (
            pf.profileType = 'company'
            AND ${reelAlias}.publisherType = 'company'
            AND pf.profileId = ${reelAlias}.publisherCompanyId
          )
        )
    )`;
  }

  private createViewablePublishedQuery(viewerId: number) {
    const qb = this.reelRepo
      .createQueryBuilder('reel')
      .leftJoinAndSelect('reel.creator', 'creator')
      .leftJoinAndSelect('reel.publisherCompany', 'publisherCompany')
      .where('reel.deletedAt IS NULL')
      .andWhere('reel.status = :publishedStatus', {
        publishedStatus: 'published',
      })
      .andWhere('creator.isBanned = :creatorBanned', {
        creatorBanned: false,
      })
      .andWhere('creator.deletedAt IS NULL')
      .andWhere(
        `(
          COALESCE(reel.publisherType, 'user') = 'user'
          OR publisherCompany.verificationStatus = 'approved'
          OR reel.creatorId = :userId
        )`,
        { userId: viewerId },
      )
      .andWhere(
        new Brackets((visibilityQb) => {
          visibilityQb.where('reel.visibility = :publicVisibility', {
            publicVisibility: 'public',
          });
          visibilityQb.orWhere('reel.creatorId = :userId', {
            userId: viewerId,
          });
          visibilityQb.orWhere(
            `(
              reel.visibility = :followersVisibility
              AND ${this.publisherFollowExistsSql('reel')}
            )`,
            { followersVisibility: 'followers', userId: viewerId },
          );
        }),
      );

    return qb as SelectQueryBuilder<Reel>;
  }

  private async applyBlockedPublisherFilters(
    qb: SelectQueryBuilder<Reel>,
    viewerId: number,
  ) {
    const blocked = await this.moderationService.blockedTargets(viewerId);
    if (blocked.userIds.length) {
      qb.andWhere(
        "(COALESCE(reel.publisherType, 'user') != 'user' OR reel.creatorId NOT IN (:...blockedReelUserIds))",
        { blockedReelUserIds: blocked.userIds },
      );
    }
    if (blocked.companyIds.length) {
      qb.andWhere(
        "(reel.publisherType != 'company' OR reel.publisherCompanyId NOT IN (:...blockedReelCompanyIds))",
        { blockedReelCompanyIds: blocked.companyIds },
      );
    }
    return qb;
  }

  private getUploadExpiry() {
    return new Date(Date.now() + getReelUploadTtlMinutes() * 60 * 1000);
  }

  private isExpired(expiresAt: Date) {
    return new Date(expiresAt).getTime() <= Date.now();
  }

  private async markSessionExpired(session: ReelUploadSession) {
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

  private async incrementCounter(
    reelId: number,
    field: 'likesCount' | 'commentsCount' | 'savesCount' | 'sharesCount',
  ) {
    await this.reelRepo.increment({ id: reelId }, field, 1);
  }

  private async decrementCounter(
    reelId: number,
    field: 'likesCount' | 'commentsCount' | 'savesCount' | 'sharesCount',
  ) {
    await this.reelRepo
      .createQueryBuilder()
      .update(Reel)
      .set({ [field]: () => `GREATEST(${field} - 1, 0)` })
      .where('id = :reelId', { reelId })
      .execute();
  }

  private encodeCursor(item: { id: number; createdAt: Date }) {
    return Buffer.from(
      JSON.stringify({
        id: item.id,
        createdAt: item.createdAt.toISOString(),
      }),
    ).toString('base64');
  }

  private decodeCursor(cursor?: string) {
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
    } catch {
      return null;
    }
  }
}
