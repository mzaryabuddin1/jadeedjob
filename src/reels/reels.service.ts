import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
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
import { Reel, ReelCategory, ReelVisibility } from './entities/reel.entity';
import { ReelUploadSession } from './entities/reel-upload-session.entity';
import { ReelLike } from './entities/reel-like.entity';
import { ReelSave } from './entities/reel-save.entity';
import { ReelComment } from './entities/reel-comment.entity';
import { ReelCreatorFollow } from './entities/reel-creator-follow.entity';

type CreateReelPayload = {
  caption: string;
  category: ReelCategory;
  audioTitle?: string;
  linkedJobId?: number;
  visibility: ReelVisibility;
  allowComments: boolean;
  allowSharing: boolean;
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

    @InjectRepository(ReelCreatorFollow)
    private readonly followRepo: Repository<ReelCreatorFollow>,

    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly storage: ReelStorageService,
  ) {}

  onModuleInit() {
    this.cleanupExpiredUploadSessions().catch(() => undefined);

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredUploadSessions().catch(() => undefined);
    }, 60 * 60 * 1000);

    this.cleanupTimer.unref?.();
  }

  async createReel(data: CreateReelPayload, userId: number) {
    await this.cleanupExpiredUploadSessions();
    this.validateCreateMedia(data.media);

    if (data.linkedJobId) {
      const job = await this.jobRepo.findOne({
        where: { id: Number(data.linkedJobId), isActive: true },
      });

      if (!job) {
        throw new BadRequestException('Linked job does not exist or is not active');
      }
    }

    const reel = await this.reelRepo.save(
      this.reelRepo.create({
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
      .where('reel.deletedAt IS NULL');

    if (feed === 'mine') {
      qb.andWhere('reel.creatorId = :userId', { userId });
    } else {
      qb.andWhere('reel.status = :publishedStatus', {
        publishedStatus: 'published',
      });

      if (feed === 'following') {
        qb.andWhere(
          `EXISTS (
            SELECT 1 FROM reel_creator_follows f
            WHERE f.creatorId = reel.creatorId AND f.followerId = :userId
          )`,
          { userId },
        );
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
                AND EXISTS (
                  SELECT 1 FROM reel_creator_follows f
                  WHERE f.creatorId = reel.creatorId AND f.followerId = :userId
                )
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
      data: pageItems.map((comment) => this.formatComment(comment)),
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
    if (creatorId === followerId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const creator = await this.userRepo.findOne({ where: { id: creatorId } });
    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    const existing = await this.followRepo.findOne({
      where: { creatorId, followerId },
    });

    if (!existing) {
      await this.followRepo.save(
        this.followRepo.create({ creatorId, followerId }),
      );
    }

    return { creatorId: String(creatorId), following: true };
  }

  async unfollowCreator(creatorId: number, followerId: number) {
    const existing = await this.followRepo.findOne({
      where: { creatorId, followerId },
    });

    if (existing) {
      await this.followRepo.delete(existing.id);
    }

    return { creatorId: String(creatorId), following: false };
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

    if (reel.visibility === 'followers' && reel.creatorId !== userId) {
      const follows = await this.followRepo.findOne({
        where: { creatorId: reel.creatorId, followerId: userId },
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
      relations: ['creator', 'linkedJob'],
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
    const creatorIds = Array.from(new Set(reels.map((reel) => reel.creatorId)));

    const [likes, saves, follows] = await Promise.all([
      this.likeRepo.find({ where: { userId: viewerId, reelId: In(reelIds) } }),
      this.saveRepo.find({ where: { userId: viewerId, reelId: In(reelIds) } }),
      this.followRepo.find({
        where: { followerId: viewerId, creatorId: In(creatorIds) },
      }),
    ]);

    const likedIds = new Set(likes.map((like) => like.reelId));
    const savedIds = new Set(saves.map((save) => save.reelId));
    const followedCreatorIds = new Set(
      follows.map((follow) => follow.creatorId),
    );

    return reels.map((reel) =>
      this.formatReelSync(reel, viewerId, likedIds, savedIds, followedCreatorIds),
    );
  }

  private async formatReel(reel: Reel, viewerId: number) {
    const [like, save, follow] = await Promise.all([
      this.likeRepo.findOne({ where: { reelId: reel.id, userId: viewerId } }),
      this.saveRepo.findOne({ where: { reelId: reel.id, userId: viewerId } }),
      this.followRepo.findOne({
        where: { creatorId: reel.creatorId, followerId: viewerId },
      }),
    ]);

    return this.formatReelSync(
      reel,
      viewerId,
      new Set(like ? [reel.id] : []),
      new Set(save ? [reel.id] : []),
      new Set(follow ? [reel.creatorId] : []),
    );
  }

  private formatReelSync(
    reel: Reel,
    viewerId: number,
    likedIds: Set<number>,
    savedIds: Set<number>,
    followedCreatorIds: Set<number>,
  ) {
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

  private formatComment(comment: ReelComment | null) {
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

  private formatAuthor(user?: User) {
    const name =
      user?.full_name ||
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
      avatarUri:
        user?.profile_photo ||
        `https://i.pravatar.cc/160?u=jadeed-${user?.id || 'anonymous'}`,
      verified: Boolean(user?.isVerified),
    };
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
