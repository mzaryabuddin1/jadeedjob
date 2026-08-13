import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { Job } from 'src/job/entities/job.entity';
import { PagesService } from 'src/pages/pages.service';
import { ProfileFollow } from 'src/profiles/entities/profile-follow.entity';
import {
  formatCompanyPublisher,
  formatUserPublisher,
} from 'src/profiles/profile-format.util';
import { User } from 'src/users/entities/user.entity';
import {
  CommunityPost,
  PostPublisherType,
} from './entities/community-post.entity';
import { PostComment } from './entities/post-comment.entity';
import { PostLike } from './entities/post-like.entity';
import { PostReport } from './entities/post-report.entity';
import { PostSave } from './entities/post-save.entity';
import { PostStorageService } from './post-storage.service';
import { PostVideoUploadSession } from './entities/post-video-upload-session.entity';
import {
  isAllowedPostVideoFileName,
  isAllowedPostVideoMimeType,
  POST_VIDEO_MAX_BYTES,
  PostVideoStorageService,
} from './post-video-storage.service';
import { ModerationService } from 'src/moderation/moderation.service';
import { ObjectStorageService } from 'src/storage/object-storage.service';
import { IdempotencyService } from 'src/idempotency/idempotency.service';
import { NotificationsService } from 'src/notifications/notifications.service';

type PostFeedQuery = {
  feed?: 'forYou' | 'mine';
  cursor?: string;
  limit?: number;
  publisherType?: PostPublisherType;
  publisherId?: number;
};

type PostSearchQuery = {
  q: string;
  page?: number;
  limit?: number;
};

type PostMutationBody = {
  publisherType?: PostPublisherType;
  publisherId?: number | string;
  body?: string | null;
  linkedJobId?: number | string | null;
  allowComments?: boolean | string;
  removeImage?: boolean | string;
  removeMedia?: boolean | string;
};

type PostVideoMediaInput = {
  fileName: string;
  contentType: string;
  fileSizeBytes?: number;
  durationSeconds?: number;
};

type CreateVideoPostBody = PostMutationBody & {
  media: PostVideoMediaInput;
};

type FeedCursor =
  | { mode: 'feed'; score: number; id: number }
  | { mode: 'profile'; createdAt: string; id: number }
  | { mode: 'mine'; createdAt: string; id: number };

@Injectable()
export class PostsService implements OnModuleInit, OnModuleDestroy {
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(CommunityPost)
    private readonly postRepo: Repository<CommunityPost>,
    @InjectRepository(PostLike)
    private readonly likeRepo: Repository<PostLike>,
    @InjectRepository(PostSave)
    private readonly saveRepo: Repository<PostSave>,
    @InjectRepository(PostComment)
    private readonly commentRepo: Repository<PostComment>,
    @InjectRepository(PostReport)
    private readonly reportRepo: Repository<PostReport>,
    @InjectRepository(ProfileFollow)
    private readonly followRepo: Repository<ProfileFollow>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(PostVideoUploadSession)
    private readonly videoUploadRepo: Repository<PostVideoUploadSession>,
    private readonly pagesService: PagesService,
    private readonly storage: PostStorageService,
    private readonly videoStorage: PostVideoStorageService,
    private readonly moderationService: ModerationService,
    private readonly objectStorageService: ObjectStorageService,
    private readonly idempotencyService: IdempotencyService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    this.cleanupExpiredVideoUploads().catch(() => undefined);
    this.cleanupTimer = setInterval(
      () => {
        this.cleanupExpiredVideoUploads().catch(() => undefined);
      },
      60 * 60 * 1000,
    );
    this.cleanupTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  async getFeed(query: PostFeedQuery, viewerId: number) {
    const limit = Math.min(30, Math.max(1, Number(query.limit) || 10));
    const profileFiltered = Boolean(query.publisherType && query.publisherId);
    const cursor = this.decodeCursor(query.cursor);
    if (query.feed === 'mine') {
      if (profileFiltered) {
        throw new BadRequestException(
          'feed=mine cannot be combined with publisher filters',
        );
      }
      return this.getManageableFeed(viewerId, cursor, limit);
    }
    const qb = this.createViewableQuery();
    await this.applyBlockedPublisherFilters(qb, viewerId);

    if (profileFiltered) {
      if (cursor && cursor.mode !== 'profile') {
        throw new BadRequestException('Post cursor does not match this feed');
      }
      this.applyPublisherFilter(
        qb,
        query.publisherType as PostPublisherType,
        Number(query.publisherId),
      );

      if (cursor?.mode === 'profile') {
        qb.andWhere(
          new Brackets((cursorQb) => {
            cursorQb.where('post.createdAt < :cursorCreatedAt', {
              cursorCreatedAt: cursor.createdAt,
            });
            cursorQb.orWhere(
              'post.createdAt = :cursorCreatedAt AND post.id < :cursorId',
              { cursorCreatedAt: cursor.createdAt, cursorId: cursor.id },
            );
          }),
        );
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
        nextCursor:
          hasMore && pageItems.length
            ? this.encodeCursor({
                mode: 'profile',
                createdAt:
                  pageItems[pageItems.length - 1].createdAt.toISOString(),
                id: pageItems[pageItems.length - 1].id,
              })
            : null,
      };
    }

    if (cursor && cursor.mode !== 'feed') {
      throw new BadRequestException('Post cursor does not match this feed');
    }

    const scoreSql = `(UNIX_TIMESTAMP(post.createdAt) + CASE WHEN ${this.publisherFollowExistsSql(
      'post',
    )} THEN 86400 ELSE 0 END)`;

    if (cursor?.mode === 'feed') {
      qb.andWhere(
        new Brackets((cursorQb) => {
          cursorQb.where(`${scoreSql} < :cursorScore`, {
            cursorScore: cursor.score,
            viewerId,
          });
          cursorQb.orWhere(
            `${scoreSql} = :cursorScore AND post.id < :cursorId`,
            { cursorScore: cursor.score, cursorId: cursor.id, viewerId },
          );
        }),
      );
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
      nextCursor:
        hasMore && lastIndex >= 0
          ? this.encodeCursor({
              mode: 'feed',
              score: lastScore,
              id: pageItems[lastIndex].id,
            })
          : null,
    };
  }

  async searchPosts(query: PostSearchQuery, viewerId: number) {
    const q = String(query.q || '')
      .trim()
      .toLowerCase();
    if (q.length < 2 || q.length > 80) {
      throw new BadRequestException(
        'Search query must be between 2 and 80 characters',
      );
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(30, Math.max(1, Number(query.limit) || 20));
    const patterns = this.getSearchPatterns(q);
    const userDisplayName = `COALESCE(
      NULLIF(TRIM(creator.full_name), ''),
      TRIM(CONCAT_WS(' ', creator.firstName, creator.lastName))
    )`;
    const publisherDisplayName = `CASE
      WHEN post.publisherType = 'company'
        THEN COALESCE(publisherCompany.company_name, '')
      ELSE ${userDisplayName}
    END`;
    const linkedJobCreatorName = `COALESCE(
      NULLIF(TRIM(linkedJobCreator.full_name), ''),
      TRIM(CONCAT_WS(' ', linkedJobCreator.firstName, linkedJobCreator.lastName))
    )`;
    const linkedJobCompanyName = `COALESCE(
      linkedJobPage.company_name,
      ${linkedJobCreatorName},
      ''
    )`;
    const searchable = `(
      LOWER(COALESCE(post.body, '')) LIKE :containsQuery ESCAPE '!'
      OR LOWER(${publisherDisplayName}) LIKE :containsQuery ESCAPE '!'
      OR LOWER(COALESCE(publisherCompany.username, '')) LIKE :containsQuery ESCAPE '!'
      OR LOWER(COALESCE(linkedJob.title, '')) LIKE :containsQuery ESCAPE '!'
      OR LOWER(${linkedJobCompanyName}) LIKE :containsQuery ESCAPE '!'
    )`;
    const rank = `CASE
      WHEN LOWER(TRIM(COALESCE(post.body, ''))) = :exactQuery
        OR LOWER(${publisherDisplayName}) = :exactQuery
        OR LOWER(COALESCE(publisherCompany.username, '')) = :exactQuery
        OR LOWER(COALESCE(linkedJob.title, '')) = :exactQuery
        OR LOWER(${linkedJobCompanyName}) = :exactQuery THEN 0
      WHEN LOWER(TRIM(COALESCE(post.body, ''))) LIKE :prefixQuery ESCAPE '!'
        OR LOWER(${publisherDisplayName}) LIKE :prefixQuery ESCAPE '!'
        OR LOWER(COALESCE(publisherCompany.username, '')) LIKE :prefixQuery ESCAPE '!'
        OR LOWER(COALESCE(linkedJob.title, '')) LIKE :prefixQuery ESCAPE '!'
        OR LOWER(${linkedJobCompanyName}) LIKE :prefixQuery ESCAPE '!' THEN 1
      ELSE 2
    END`;

    const qb = this.createViewableQuery();
    await this.applyBlockedPublisherFilters(qb, viewerId);
    qb.andWhere(searchable, patterns)
      .addSelect(rank, 'searchRank')
      .orderBy('searchRank', 'ASC')
      .addOrderBy('post.createdAt', 'DESC')
      .addOrderBy('post.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [posts, total] = await qb.getManyAndCount();

    return {
      data: await this.formatPosts(posts, viewerId),
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  }

  async getPost(postId: number, viewerId: number) {
    return this.formatPost(
      await this.getViewablePostOrThrow(postId, viewerId),
      viewerId,
    );
  }

  async createVideoUpload(
    data: CreateVideoPostBody,
    userId: number,
    idempotencyKey?: string,
  ) {
    return this.idempotencyService.execute(
      userId,
      'post:video:create',
      idempotencyKey,
      data,
      () => this.createVideoUploadInternal(data, userId),
    );
  }

  private async createVideoUploadInternal(
    data: CreateVideoPostBody,
    userId: number,
  ) {
    await this.cleanupExpiredVideoUploads();
    this.validateVideoMetadata(data.media);
    const publisher = await this.resolvePublisher(
      data.publisherType,
      data.publisherId,
      userId,
    );
    const linkedJob = await this.validateLinkedJob(
      data.linkedJobId,
      publisher.type,
      publisher.companyId,
    );
    const post = await this.postRepo.save(
      this.postRepo.create({
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
      }),
    );

    const session = await this.createVideoUploadSession(
      post,
      data.media,
      userId,
      false,
    );
    return {
      post: await this.formatPost(
        await this.getPostByIdOrThrow(post.id),
        userId,
      ),
      upload: this.videoStorage.getUploadInstructions(post, session),
    };
  }

  async createVideoReplacement(
    postId: number,
    media: PostVideoMediaInput,
    userId: number,
    idempotencyKey?: string,
  ) {
    return this.idempotencyService.execute(
      userId,
      `post:video:replace:${postId}`,
      idempotencyKey,
      media,
      () => this.createVideoReplacementInternal(postId, media, userId),
    );
  }

  private async createVideoReplacementInternal(
    postId: number,
    media: PostVideoMediaInput,
    userId: number,
  ) {
    await this.cleanupExpiredVideoUploads();
    this.validateVideoMetadata(media);
    const post = await this.getPostByIdOrThrow(postId);
    await this.assertCanManage(post, userId);
    const session = await this.createVideoUploadSession(
      post,
      media,
      userId,
      true,
    );
    return {
      post: await this.formatPost(post, userId),
      upload: this.videoStorage.getUploadInstructions(post, session),
    };
  }

  async uploadVideo(
    postId: number,
    userId: number,
    uploadId: string,
    file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No video file provided');
    const { post, session } = await this.getOwnedVideoUploadSession(
      postId,
      userId,
      uploadId,
    );
    if (session.status !== 'pending') {
      await this.videoStorage.deleteLocalFile(file.path);
      throw new BadRequestException('Upload session is not accepting files');
    }
    if (this.isExpired(session.expiresAt)) {
      await this.videoStorage.deleteLocalFile(file.path);
      await this.expireVideoUploadSession(session);
      throw new BadRequestException('Upload session has expired');
    }

    this.validateUploadedVideo(file);
    let stored: Awaited<
      ReturnType<PostVideoStorageService['commitUpload']>
    > | null = null;
    try {
      stored = await this.videoStorage.commitUpload(post, session, file);
      const inspection = await this.videoStorage.inspectVideo(
        stored.localFilePath,
      );
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
    } catch (error) {
      await this.videoStorage.deleteLocalFile(file.path);
      await this.videoStorage.deleteLocalFile(stored?.localFilePath);
      await this.videoUploadRepo.save({
        ...session,
        status: 'failed',
        errorMessage:
          error instanceof Error ? error.message : 'Video upload failed',
      });
      if (!session.replacement) {
        await this.postRepo.update(post.id, { mediaStatus: 'failed' });
      }
      throw error;
    }

    if (!stored) throw new BadRequestException('Video upload failed');

    return {
      uploadId: session.uploadId,
      postId: String(post.id),
      status: 'uploaded',
      fileName: stored.fileName,
      fileSizeBytes: file.size,
      contentType: file.mimetype,
    };
  }

  async completeVideoUpload(postId: number, userId: number, uploadId: string) {
    const { post, session } = await this.getOwnedVideoUploadSession(
      postId,
      userId,
      uploadId,
    );
    if (session.status === 'completed') {
      return this.formatPost(await this.getPostByIdOrThrow(postId), userId);
    }
    if (session.status !== 'uploaded' || !session.localFilePath) {
      throw new BadRequestException('Upload has not completed');
    }
    if (this.isExpired(session.expiresAt)) {
      await this.expireVideoUploadSession(session);
      throw new BadRequestException('Upload session has expired');
    }

    await this.assertCanManage(post, userId);
    await this.validateLinkedJob(
      post.linkedJobId,
      this.getPublisherType(post),
      post.publisherCompanyId,
    );

    const thumbnail = await this.videoStorage.createThumbnail(
      post.id,
      session.localFilePath,
    );
    let stored: Awaited<
      ReturnType<PostVideoStorageService['storeCompletedMedia']>
    > | null = null;
    const oldImageAssetId = post.imageAssetId;
    const oldImageKey = post.imageStorageKey;
    const oldVideoAssetId = post.videoAssetId;
    const oldVideoKey = post.videoStorageKey;
    const oldThumbnailAssetId = post.videoThumbnailAssetId;
    const oldThumbnailKey = post.videoThumbnailStorageKey;

    try {
      stored = await this.videoStorage.storeCompletedMedia(
        post,
        session,
        thumbnail,
      );
      await this.postRepo.manager.transaction(async (manager) => {
        await manager.save(CommunityPost, {
          ...post,
          mediaType: 'video',
          mediaStatus: 'published',
          imageUrl: null,
          imageAssetId: null,
          imageStorageKey: null,
          videoUrl: null,
          videoAssetId: stored.videoAsset.id,
          videoStorageKey: stored.videoAsset.storageKey,
          videoThumbnailUrl: null,
          videoThumbnailAssetId: stored.thumbnailAsset.id,
          videoThumbnailStorageKey: stored.thumbnailAsset.storageKey,
          videoContentType:
            session.uploadedContentType || session.contentType || null,
          videoFileSizeBytes:
            session.uploadedFileSizeBytes ??
            session.expectedFileSizeBytes ??
            null,
          videoDurationSeconds:
            session.uploadedDurationSeconds ??
            session.clientDurationSeconds ??
            null,
        });
        await manager.save(PostVideoUploadSession, {
          ...session,
          uploadedAssetId: stored.videoAsset.id,
          thumbnailAssetId: stored.thumbnailAsset.id,
          uploadKey: stored.videoAsset.storageKey,
          status: 'completed',
          completedAt: new Date(),
        });
      });
    } catch (error) {
      if (stored) {
        await Promise.all([
          this.videoStorage.remove(stored.videoAsset.id),
          this.videoStorage.remove(stored.thumbnailAsset.id),
        ]);
      }
      throw error;
    } finally {
      await Promise.all([
        this.videoStorage.deleteLocalFile(session.localFilePath),
        this.videoStorage.deleteLocalFile(thumbnail.localFilePath),
      ]);
    }

    if (!stored) throw new BadRequestException('Video upload failed');

    await Promise.all([
      this.storage.remove(oldImageAssetId, oldImageKey),
      oldVideoAssetId !== stored.videoAsset.id
        ? this.videoStorage.remove(oldVideoAssetId, oldVideoKey)
        : Promise.resolve(),
      oldThumbnailAssetId !== stored.thumbnailAsset.id
        ? this.videoStorage.remove(oldThumbnailAssetId, oldThumbnailKey)
        : Promise.resolve(),
    ]);
    return this.formatPost(await this.getPostByIdOrThrow(postId), userId);
  }

  async createPost(
    data: PostMutationBody,
    image: Express.Multer.File | undefined,
    userId: number,
    idempotencyKey?: string,
  ) {
    const request = await this.idempotencyService.multipartRequest(data, image);
    return this.idempotencyService.execute(
      userId,
      'post:create',
      idempotencyKey,
      request,
      () => this.createPostInternal(data, image, userId),
    );
  }

  private async createPostInternal(
    data: PostMutationBody,
    image: Express.Multer.File | undefined,
    userId: number,
  ) {
    const body = this.normalizeBody(data.body);
    if (!body && !image) {
      throw new BadRequestException('Add text or an image to publish');
    }

    const publisher = await this.resolvePublisher(
      data.publisherType,
      data.publisherId,
      userId,
    );
    const linkedJob = await this.validateLinkedJob(
      data.linkedJobId,
      publisher.type,
      publisher.companyId,
    );

    const post = await this.postRepo.save(
      this.postRepo.create({
        creatorId: userId,
        publisherType: publisher.type,
        publisherCompanyId: publisher.companyId,
        body,
        linkedJobId: linkedJob?.id ?? null,
        allowComments: this.parseBoolean(data.allowComments, true),
        mediaType: image ? 'image' : 'none',
        mediaStatus: 'published',
      }),
    );

    if (image) {
      try {
        const stored = await this.storage.save(post.id, userId, image);
        post.imageUrl = null;
        post.imageAssetId = stored.assetId;
        post.imageStorageKey = stored.storageKey;
        await this.postRepo.save(post);
      } catch (error) {
        await this.postRepo.delete(post.id);
        throw error;
      }
    }

    return this.formatPost(await this.getPostByIdOrThrow(post.id), userId);
  }

  async updatePost(
    postId: number,
    data: PostMutationBody,
    image: Express.Multer.File | undefined,
    userId: number,
  ) {
    const post = await this.getPostByIdOrThrow(postId);
    await this.assertCanManage(post, userId);

    const removeImage = this.parseBoolean(data.removeImage, false);
    const removeMedia = this.parseBoolean(data.removeMedia, false);
    if (image && (removeImage || removeMedia)) {
      throw new BadRequestException(
        'Choose replacement media or remove the current media, not both',
      );
    }

    const hasBody = data.body !== undefined;
    const hasLinkedJob = data.linkedJobId !== undefined;
    const hasComments = data.allowComments !== undefined;
    if (
      !hasBody &&
      !hasLinkedJob &&
      !hasComments &&
      !removeImage &&
      !removeMedia &&
      !image
    ) {
      throw new BadRequestException('No post changes were provided');
    }

    if (hasBody) post.body = this.normalizeBody(data.body);
    if (hasComments) {
      post.allowComments = this.parseBoolean(data.allowComments, true);
    }
    if (hasLinkedJob) {
      const linkedJob = await this.validateLinkedJob(
        data.linkedJobId,
        this.getPublisherType(post),
        post.publisherCompanyId,
      );
      post.linkedJobId = linkedJob?.id ?? null;
    }

    const oldImageAssetId = post.imageAssetId;
    const oldStorageKey = post.imageStorageKey;
    const oldVideoAssetId = post.videoAssetId;
    const oldVideoStorageKey = post.videoStorageKey;
    const oldVideoThumbnailAssetId = post.videoThumbnailAssetId;
    const oldVideoThumbnailStorageKey = post.videoThumbnailStorageKey;
    if (removeImage || removeMedia) {
      post.imageUrl = null;
      post.imageAssetId = null;
      post.imageStorageKey = null;
      if (!post.videoAssetId && !post.videoUrl) post.mediaType = 'none';
    }
    if (removeMedia) {
      this.clearVideoMedia(post);
      post.mediaType = 'none';
      post.mediaStatus = 'published';
    }

    let newAssetId: string | null = null;
    if (image) {
      const stored = await this.storage.save(post.id, userId, image);
      newAssetId = stored.assetId;
      post.imageUrl = null;
      post.imageAssetId = stored.assetId;
      post.imageStorageKey = stored.storageKey;
      this.clearVideoMedia(post);
      post.mediaType = 'image';
      post.mediaStatus = 'published';
    }

    if (
      !post.body &&
      !post.imageAssetId &&
      !post.imageUrl &&
      !post.videoAssetId &&
      !post.videoUrl
    ) {
      if (newAssetId) await this.storage.remove(newAssetId);
      throw new BadRequestException('A post needs text, a photo, or a video');
    }

    try {
      await this.postRepo.save(post);
    } catch (error) {
      if (newAssetId) await this.storage.remove(newAssetId);
      throw error;
    }

    if (
      (removeImage || removeMedia || image) &&
      (oldImageAssetId !== post.imageAssetId ||
        oldStorageKey !== post.imageStorageKey)
    ) {
      await this.storage.remove(oldImageAssetId, oldStorageKey);
    }
    if (
      (removeMedia || image) &&
      (oldVideoAssetId !== post.videoAssetId ||
        oldVideoStorageKey !== post.videoStorageKey)
    ) {
      await this.videoStorage.remove(oldVideoAssetId, oldVideoStorageKey);
    }
    if (
      (removeMedia || image) &&
      (oldVideoThumbnailAssetId !== post.videoThumbnailAssetId ||
        oldVideoThumbnailStorageKey !== post.videoThumbnailStorageKey)
    ) {
      await this.videoStorage.remove(
        oldVideoThumbnailAssetId,
        oldVideoThumbnailStorageKey,
      );
    }

    return this.formatPost(await this.getPostByIdOrThrow(postId), userId);
  }

  async deletePost(postId: number, userId: number) {
    const post = await this.getPostByIdOrThrow(postId);
    await this.assertCanManage(post, userId);
    post.deletedAt = new Date();
    await this.postRepo.save(post);
    await Promise.all([
      this.storage.remove(post.imageAssetId, post.imageStorageKey),
      this.videoStorage.remove(post.videoAssetId, post.videoStorageKey),
      this.videoStorage.remove(
        post.videoThumbnailAssetId,
        post.videoThumbnailStorageKey,
      ),
    ]);
    return { id: String(post.id), deleted: true };
  }

  async like(postId: number, userId: number) {
    await this.getViewablePostOrThrow(postId, userId);
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

  async unlike(postId: number, userId: number) {
    await this.getViewablePostOrThrow(postId, userId);
    const result = await this.likeRepo.delete({ postId, userId });
    if (result.affected) await this.decrementCounter(postId, 'likesCount');
    return this.getPost(postId, userId);
  }

  async save(postId: number, userId: number) {
    await this.getViewablePostOrThrow(postId, userId);
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

  async unsave(postId: number, userId: number) {
    await this.getViewablePostOrThrow(postId, userId);
    const result = await this.saveRepo.delete({ postId, userId });
    if (result.affected) await this.decrementCounter(postId, 'savesCount');
    return this.getPost(postId, userId);
  }

  async share(postId: number, userId: number) {
    await this.getViewablePostOrThrow(postId, userId);
    await this.postRepo.increment({ id: postId }, 'sharesCount', 1);
    return this.getPost(postId, userId);
  }

  async getComments(
    postId: number,
    viewerId: number,
    cursor?: string,
    limit = 20,
  ) {
    await this.getViewablePostOrThrow(postId, viewerId);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
    const decoded = this.decodeSimpleCursor(cursor);
    const qb = this.commentRepo
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .where('comment.postId = :postId', { postId })
      .andWhere('comment.deletedAt IS NULL')
      .andWhere('comment.moderationStatus = :commentModerationStatus', {
        commentModerationStatus: 'visible',
      })
      .andWhere('user.isBanned = :isBanned', { isBanned: false });

    if (decoded) {
      qb.andWhere(
        new Brackets((cursorQb) => {
          cursorQb.where('comment.createdAt < :createdAt', decoded);
          cursorQb.orWhere(
            'comment.createdAt = :createdAt AND comment.id < :id',
            decoded,
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
      nextCursor:
        hasMore && pageItems.length
          ? this.encodeSimpleCursor(pageItems[pageItems.length - 1])
          : null,
    };
  }

  async addComment(
    postId: number,
    userId: number,
    text: string,
    idempotencyKey?: string,
  ) {
    return this.idempotencyService.execute(
      userId,
      `post:comment:create:${postId}`,
      idempotencyKey,
      { text: String(text || '').trim() },
      () => this.addCommentInternal(postId, userId, text, idempotencyKey),
    );
  }

  private async addCommentInternal(
    postId: number,
    userId: number,
    text: string,
    idempotencyKey?: string,
  ) {
    const post = await this.getViewablePostOrThrow(postId, userId);
    if (!post.allowComments) {
      throw new BadRequestException('Comments are disabled for this post');
    }

    const comment = await this.commentRepo.save(
      this.commentRepo.create({ postId, userId, text: text.trim() }),
    );
    await this.postRepo.increment({ id: postId }, 'commentsCount', 1);
    const formatted = await this.formatComment(
      await this.commentRepo.findOne({
        where: { id: comment.id },
        relations: ['user'],
      }),
    );
    if (post.creatorId !== userId) {
      await this.notificationsService.create({
        userId: post.creatorId,
        type: 'post_comment',
        title: 'New post comment',
        message: 'Someone commented on your post.',
        data: {
          postId: String(postId),
          commentId: String(comment.id),
          profileType: 'user',
          profileId: String(userId),
        },
        dedupeKey: `post_comment:${postId}:${userId}:${
          idempotencyKey || comment.id
        }`,
      });
    }
    return formatted;
  }

  async deleteComment(
    postId: number,
    commentId: number,
    userId: number,
    isSystemAdmin = false,
  ) {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId, postId },
      relations: ['post', 'post.creator', 'post.publisherCompany'],
    });
    if (!comment || comment.deletedAt) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.userId !== userId && !isSystemAdmin) {
      await this.assertCanManage(comment.post, userId);
    }
    comment.deletedAt = new Date();
    comment.deletedByUserId = userId;
    comment.deletionReason = isSystemAdmin
      ? 'admin_removed'
      : comment.userId === userId
        ? 'author_removed'
        : 'publisher_removed';
    await this.commentRepo.save(comment);
    await this.postRepo
      .createQueryBuilder()
      .update(CommunityPost)
      .set({ commentsCount: () => 'GREATEST(commentsCount - 1, 0)' })
      .where('id = :postId', { postId })
      .execute();
    return {
      id: String(comment.id),
      postId: String(postId),
      deleted: true,
    };
  }

  async report(
    postId: number,
    userId: number,
    reason = 'other',
    details?: string,
  ) {
    const post = await this.getViewablePostOrThrow(postId, userId);
    if (post.creatorId === userId) {
      throw new BadRequestException('You cannot report your own post');
    }

    const existing = await this.reportRepo.findOne({
      where: { postId, userId },
    });
    if (existing) {
      throw new BadRequestException('Post already reported');
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

  private async getManageableFeed(
    viewerId: number,
    cursor: FeedCursor | null,
    limit: number,
  ) {
    if (cursor && cursor.mode !== 'mine') {
      throw new BadRequestException('Post cursor does not match this feed');
    }
    const accounts = await this.pagesService.getEmployerAccounts(viewerId);
    const companyAccounts = accounts.data.filter(
      (account) => account.companyId && account.canPublish,
    );
    const publishableIds = companyAccounts.map((account) =>
      Number(account.companyId),
    );
    const manageableIds = companyAccounts
      .filter(
        (account) =>
          account.roleType === 'owner' || account.roleType === 'admin',
      )
      .map((account) => Number(account.companyId));

    const qb = this.postRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.creator', 'creator')
      .leftJoinAndSelect('post.publisherCompany', 'publisherCompany')
      .leftJoinAndSelect('post.linkedJob', 'linkedJob')
      .leftJoinAndSelect('linkedJob.page', 'linkedJobPage')
      .leftJoinAndSelect('linkedJob.creator', 'linkedJobCreator')
      .where('post.deletedAt IS NULL')
      .andWhere('post.moderationStatus = :mineModerationStatus', {
        mineModerationStatus: 'visible',
      })
      .andWhere(
        new Brackets((where) => {
          where.where(
            "post.publisherType = 'user' AND post.creatorId = :viewerId",
            { viewerId },
          );
          if (publishableIds.length) {
            where.orWhere(
              "post.publisherType = 'company' AND post.creatorId = :viewerId AND post.publisherCompanyId IN (:...publishableIds)",
              { viewerId, publishableIds },
            );
          }
          if (manageableIds.length) {
            where.orWhere(
              "post.publisherType = 'company' AND post.publisherCompanyId IN (:...manageableIds)",
              { manageableIds },
            );
          }
        }),
      );
    if (cursor?.mode === 'mine') {
      qb.andWhere(
        new Brackets((where) => {
          where.where('post.createdAt < :createdAt', {
            createdAt: cursor.createdAt,
          });
          where.orWhere('post.createdAt = :createdAt AND post.id < :cursorId', {
            createdAt: cursor.createdAt,
            cursorId: cursor.id,
          });
        }),
      );
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
      nextCursor:
        hasMore && pageItems.length
          ? this.encodeCursor({
              mode: 'mine',
              createdAt:
                pageItems[pageItems.length - 1].createdAt.toISOString(),
              id: pageItems[pageItems.length - 1].id,
            })
          : null,
    };
  }

  private async applyBlockedPublisherFilters(qb: any, viewerId: number) {
    const blocked = await this.moderationService.blockedTargets(viewerId);
    if (blocked.userIds.length) {
      qb.andWhere(
        "(post.publisherType != 'user' OR post.creatorId NOT IN (:...blockedPostUserIds))",
        { blockedPostUserIds: blocked.userIds },
      );
    }
    if (blocked.companyIds.length) {
      qb.andWhere(
        "(post.publisherType != 'company' OR post.publisherCompanyId NOT IN (:...blockedPostCompanyIds))",
        { blockedPostCompanyIds: blocked.companyIds },
      );
    }
    return qb;
  }

  private createViewableQuery() {
    return this.postRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.creator', 'creator')
      .leftJoinAndSelect('post.publisherCompany', 'publisherCompany')
      .leftJoinAndSelect('post.linkedJob', 'linkedJob')
      .leftJoinAndSelect('linkedJob.page', 'linkedJobPage')
      .leftJoinAndSelect('linkedJob.creator', 'linkedJobCreator')
      .where('post.deletedAt IS NULL')
      .andWhere('post.moderationStatus = :moderationStatus', {
        moderationStatus: 'visible',
      })
      .andWhere('post.mediaStatus = :publishedMediaStatus', {
        publishedMediaStatus: 'published',
      })
      .andWhere('creator.isBanned = :publisherBanned', {
        publisherBanned: false,
      })
      .andWhere(
        `(
          post.publisherType = 'user'
          OR publisherCompany.verificationStatus = 'approved'
        )`,
      );
  }

  private applyPublisherFilter(qb: any, type: PostPublisherType, id: number) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('Invalid publisher ID');
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

  private async getViewablePostOrThrow(postId: number, viewerId?: number) {
    const qb = this.createViewableQuery();
    if (viewerId) await this.applyBlockedPublisherFilters(qb, viewerId);
    const post = await qb.andWhere('post.id = :postId', { postId }).getOne();
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  private async getPostByIdOrThrow(postId: number) {
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
    if (!post || post.deletedAt) throw new NotFoundException('Post not found');
    return post;
  }

  private async resolvePublisher(
    type: PostPublisherType | undefined,
    publisherId: number | string | undefined,
    userId: number,
  ) {
    if (!type || type === 'user') {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user || user.isBanned) {
        throw new ForbiddenException('This account cannot publish posts');
      }
      return { type: 'user' as const, companyId: null };
    }
    if (type !== 'company') {
      throw new BadRequestException('publisherType must be user or company');
    }

    const companyId = Number(publisherId);
    if (!Number.isInteger(companyId) || companyId <= 0) {
      throw new BadRequestException('publisherId is required for a company');
    }
    await this.pagesService.assertCompanyCanPublish(companyId, userId);
    return { type: 'company' as const, companyId };
  }

  private async validateLinkedJob(
    value: number | string | null | undefined,
    publisherType: PostPublisherType,
    publisherCompanyId?: number | null,
  ) {
    if (value === undefined || value === null || value === '') return null;
    const jobId = Number(value);
    if (!Number.isInteger(jobId) || jobId <= 0) {
      throw new BadRequestException('Invalid linked job');
    }

    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      relations: ['page', 'creator'],
    });
    if (!job || !this.isLinkedJobPublic(job)) {
      throw new BadRequestException('Linked job is not publicly available');
    }
    if (
      publisherType === 'company' &&
      (!publisherCompanyId || job.pageId !== publisherCompanyId)
    ) {
      throw new BadRequestException(
        'Company posts can only link jobs from that company',
      );
    }
    return job;
  }

  private async assertCanManage(post: CommunityPost, userId: number) {
    if (this.getPublisherType(post) === 'user') {
      if (post.creatorId === userId) return;
      throw new ForbiddenException('You cannot manage this post');
    }

    if (!post.publisherCompanyId) {
      throw new ForbiddenException('You cannot manage this post');
    }

    const access = await this.pagesService.assertCompanyCanPublish(
      post.publisherCompanyId,
      userId,
    );
    if (post.creatorId === userId) return;

    const role = access.member.role;
    if (role !== 'owner' && role !== 'admin') {
      throw new ForbiddenException('You cannot manage this post');
    }
  }

  private async formatPosts(posts: CommunityPost[], viewerId: number) {
    if (!posts.length) return [];
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

    const [likes, saves, userFollows, companyFollows, companyAccess] =
      await Promise.all([
        this.likeRepo.find({
          where: { postId: In(postIds), userId: viewerId },
        }),
        this.saveRepo.find({
          where: { postId: In(postIds), userId: viewerId },
        }),
        userPublisherIds.length
          ? this.followRepo.find({
              where: {
                followerUserId: viewerId,
                profileType: 'user',
                profileId: In(userPublisherIds),
              },
            })
          : Promise.resolve([]),
        companyPublisherIds.length
          ? this.followRepo.find({
              where: {
                followerUserId: viewerId,
                profileType: 'company',
                profileId: In(companyPublisherIds),
              },
            })
          : Promise.resolve([]),
        this.getCompanyPublishingAccess(viewerId, companyPublisherIds),
      ]);

    const likedIds = new Set(likes.map((like) => like.postId));
    const savedIds = new Set(saves.map((save) => save.postId));
    const followed = new Set(
      [...userFollows, ...companyFollows].map(
        (follow) => `${follow.profileType}:${follow.profileId}`,
      ),
    );

    return Promise.all(
      posts.map(async (post) =>
        this.withPublisherAsset(
          {
            ...this.formatPostBase(post),
            viewerState: {
              liked: likedIds.has(post.id),
              saved: savedIds.has(post.id),
              followingPublisher: followed.has(
                `${this.getPublisherType(post)}:${this.getPublisherId(post)}`,
              ),
              isOwner: post.creatorId === viewerId,
              canManage: this.canManageFromAccess(
                post,
                viewerId,
                companyAccess.publishable,
                companyAccess.manageable,
              ),
            },
          },
          post,
        ),
      ),
    );
  }

  private async formatPost(post: CommunityPost, viewerId: number) {
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

    return this.withPublisherAsset(
      {
        ...this.formatPostBase(post),
        viewerState: {
          liked: Boolean(like),
          saved: Boolean(save),
          followingPublisher: Boolean(follow),
          isOwner: post.creatorId === viewerId,
          canManage,
        },
      },
      post,
    );
  }

  private formatPostBase(post: CommunityPost) {
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

  private formatMedia(post: CommunityPost) {
    if (post.mediaType === 'video' && post.videoUrl) {
      return {
        type: 'video' as const,
        url: post.videoUrl,
        thumbnailUrl: post.videoThumbnailUrl,
        ...(post.videoDurationSeconds
          ? { durationSeconds: Number(post.videoDurationSeconds) }
          : {}),
      };
    }
    if (post.imageUrl) {
      return { type: 'image' as const, url: post.imageUrl };
    }
    return null;
  }

  private formatPublisher(post: CommunityPost) {
    if (this.getPublisherType(post) === 'company') {
      return {
        ...formatCompanyPublisher(post.publisherCompany),
        id: String(post.publisherCompanyId),
      };
    }
    return {
      ...formatUserPublisher(post.creator),
      id: String(post.creatorId),
    };
  }

  private formatLinkedJob(job: Job) {
    const creatorName =
      job.creator?.full_name ||
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

  private async formatComment(comment: PostComment | null) {
    if (!comment) return null;
    const author = formatUserPublisher(comment.user);
    return {
      id: String(comment.id),
      postId: String(comment.postId),
      author: {
        ...author,
        avatarUri: comment.user?.profilePhotoAssetId
          ? await this.objectStorageService.getUrl(
              comment.user.profilePhotoAssetId,
            )
          : author.avatarUri,
      },
      text: comment.text,
      createdAt: comment.createdAt,
    };
  }

  private async withPublisherAsset(result: any, post: CommunityPost) {
    const publisher = this.formatPublisher(post);
    const assetId =
      this.getPublisherType(post) === 'company'
        ? post.publisherCompany?.logoAssetId
        : post.creator?.profilePhotoAssetId;
    const [avatarUri, imageUrl, videoUrl, thumbnailUrl] = await Promise.all([
      assetId
        ? this.objectStorageService.getUrl(assetId)
        : Promise.resolve(publisher.avatarUri),
      post.imageAssetId
        ? this.objectStorageService.getUrl(post.imageAssetId)
        : Promise.resolve(post.imageUrl),
      post.videoAssetId
        ? this.objectStorageService.getUrl(post.videoAssetId)
        : Promise.resolve(post.videoUrl),
      post.videoThumbnailAssetId
        ? this.objectStorageService.getUrl(post.videoThumbnailAssetId)
        : Promise.resolve(post.videoThumbnailUrl),
    ]);
    const media =
      post.mediaType === 'video' && videoUrl
        ? {
            type: 'video' as const,
            url: videoUrl,
            thumbnailUrl,
            ...(post.videoDurationSeconds
              ? { durationSeconds: Number(post.videoDurationSeconds) }
              : {}),
          }
        : imageUrl
          ? { type: 'image' as const, url: imageUrl }
          : null;
    return {
      ...result,
      imageUrl,
      media,
      publisher: { ...publisher, avatarUri },
    };
  }

  private async canManage(post: CommunityPost, viewerId: number) {
    try {
      await this.assertCanManage(post, viewerId);
      return true;
    } catch {
      return false;
    }
  }

  private async getCompanyPublishingAccess(
    viewerId: number,
    companyIds: number[],
  ) {
    const publishable = new Set<number>();
    const manageable = new Set<number>();
    const ids = Array.from(new Set(companyIds.filter(Boolean)));

    await Promise.all(
      ids.map(async (companyId) => {
        try {
          const access = await this.pagesService.assertCompanyCanPublish(
            companyId,
            viewerId,
          );
          publishable.add(companyId);
          if (
            access.member.role === 'owner' ||
            access.member.role === 'admin'
          ) {
            manageable.add(companyId);
          }
        } catch {
          // Lack of publishing access is represented by canManage=false.
        }
      }),
    );

    return { publishable, manageable };
  }

  private canManageFromAccess(
    post: CommunityPost,
    viewerId: number,
    publishable: Set<number>,
    manageable: Set<number>,
  ) {
    if (this.getPublisherType(post) === 'user') {
      return post.creatorId === viewerId;
    }

    const companyId = Number(post.publisherCompanyId);
    return (
      (post.creatorId === viewerId && publishable.has(companyId)) ||
      manageable.has(companyId)
    );
  }

  private isLinkedJobPublic(job?: Job | null) {
    if (!job || !job.isActive || (job.status && job.status !== 'active')) {
      return false;
    }

    if (job.postingMode === 'company' || job.pageId) {
      return Boolean(job.pageId && job.page?.verificationStatus === 'approved');
    }

    return !job.creator?.isBanned;
  }

  private getPublisherType(post: CommunityPost): PostPublisherType {
    return post.publisherType === 'company' ? 'company' : 'user';
  }

  private getPublisherId(post: CommunityPost) {
    return this.getPublisherType(post) === 'company'
      ? Number(post.publisherCompanyId)
      : Number(post.creatorId);
  }

  private publisherFollowExistsSql(alias: string) {
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

  private async createVideoUploadSession(
    post: CommunityPost,
    media: PostVideoMediaInput,
    userId: number,
    replacement: boolean,
  ) {
    return this.videoUploadRepo.save(
      this.videoUploadRepo.create({
        uploadId: randomUUID(),
        postId: post.id,
        userId,
        replacement,
        status: 'pending',
        uploadKey: this.videoStorage.createUploadKey(
          post.id,
          media.fileName,
          media.contentType,
        ),
        originalFileName: media.fileName,
        contentType: media.contentType,
        expectedFileSizeBytes: media.fileSizeBytes ?? null,
        clientDurationSeconds: media.durationSeconds
          ? Math.ceil(Number(media.durationSeconds))
          : null,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      }),
    );
  }

  private validateVideoMetadata(media: PostVideoMediaInput) {
    if (!isAllowedPostVideoMimeType(media.contentType)) {
      throw new BadRequestException('Use an MP4, MOV, or M4V video');
    }
    if (!isAllowedPostVideoFileName(media.fileName)) {
      throw new BadRequestException('Use an MP4, MOV, or M4V video');
    }
    if (
      media.fileSizeBytes &&
      Number(media.fileSizeBytes) > POST_VIDEO_MAX_BYTES
    ) {
      throw new BadRequestException('Video must be 100 MB or smaller');
    }
  }

  private validateUploadedVideo(file: Express.Multer.File) {
    if (
      !isAllowedPostVideoMimeType(file.mimetype) ||
      !isAllowedPostVideoFileName(file.originalname)
    ) {
      throw new BadRequestException('Use an MP4, MOV, or M4V video');
    }
    if (file.size > POST_VIDEO_MAX_BYTES) {
      throw new BadRequestException('Video must be 100 MB or smaller');
    }
  }

  private async getOwnedVideoUploadSession(
    postId: number,
    userId: number,
    uploadId: string,
  ) {
    const post = await this.getPostByIdOrThrow(postId);
    await this.assertCanManage(post, userId);
    const session = await this.videoUploadRepo.findOne({
      where: { postId, userId, uploadId },
    });
    if (!session) throw new NotFoundException('Upload session not found');
    return { post, session };
  }

  private isExpired(value: Date) {
    return new Date(value).getTime() <= Date.now();
  }

  private async expireVideoUploadSession(session: PostVideoUploadSession) {
    await this.videoStorage.deleteLocalFile(session.localFilePath);
    await Promise.all([
      this.videoStorage.remove(session.uploadedAssetId),
      this.videoStorage.remove(session.thumbnailAssetId),
    ]);
    await this.videoUploadRepo.save({
      ...session,
      status: 'expired',
      errorMessage: 'Upload session expired',
    });
    if (!session.replacement) {
      await this.postRepo.update(
        { id: session.postId, mediaStatus: 'upload_pending' },
        { mediaStatus: 'failed' },
      );
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

  private clearVideoMedia(post: CommunityPost) {
    post.videoUrl = null;
    post.videoAssetId = null;
    post.videoStorageKey = null;
    post.videoThumbnailUrl = null;
    post.videoThumbnailAssetId = null;
    post.videoThumbnailStorageKey = null;
    post.videoContentType = null;
    post.videoFileSizeBytes = null;
    post.videoDurationSeconds = null;
  }

  private normalizeBody(value?: string | null) {
    const body = typeof value === 'string' ? value.trim() : '';
    if (body.length > 2000) {
      throw new BadRequestException(
        'Post text must be 2,000 characters or less',
      );
    }
    return body || null;
  }

  private parseBoolean(value: boolean | string | undefined, fallback: boolean) {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return fallback;
  }

  private getSearchPatterns(q: string) {
    const escaped = q
      .replace(/!/g, '!!')
      .replace(/%/g, '!%')
      .replace(/_/g, '!_');

    return {
      exactQuery: q,
      prefixQuery: `${escaped}%`,
      containsQuery: `%${escaped}%`,
    };
  }

  private async decrementCounter(
    postId: number,
    field: 'likesCount' | 'savesCount',
  ) {
    await this.postRepo
      .createQueryBuilder()
      .update(CommunityPost)
      .set({ [field]: () => `GREATEST(${field} - 1, 0)` } as any)
      .where('id = :postId', { postId })
      .execute();
  }

  private wasInserted(result: { raw?: any; identifiers?: any[] }) {
    if (typeof result.raw?.affectedRows === 'number') {
      return result.raw.affectedRows > 0;
    }
    return Boolean(result.identifiers?.length);
  }

  private encodeCursor(cursor: FeedCursor) {
    return Buffer.from(JSON.stringify(cursor)).toString('base64url');
  }

  private decodeCursor(value?: string): FeedCursor | null {
    if (!value) return null;
    try {
      const cursor = JSON.parse(
        Buffer.from(value, 'base64url').toString('utf8'),
      );
      const id = Number(cursor?.id);
      if (
        cursor?.mode === 'feed' &&
        Number.isFinite(Number(cursor.score)) &&
        Number.isInteger(id) &&
        id > 0
      ) {
        return { mode: 'feed', score: Number(cursor.score), id };
      }
      const createdAt = new Date(cursor?.createdAt);
      if (
        (cursor?.mode === 'profile' || cursor?.mode === 'mine') &&
        !Number.isNaN(createdAt.getTime()) &&
        Number.isInteger(id) &&
        id > 0
      ) {
        return {
          mode: cursor.mode,
          createdAt: createdAt.toISOString(),
          id,
        };
      }
    } catch {
      throw new BadRequestException('Invalid post cursor');
    }
    throw new BadRequestException('Invalid post cursor');
  }

  private encodeSimpleCursor(value: { id: number; createdAt: Date }) {
    return Buffer.from(
      JSON.stringify({
        id: value.id,
        createdAt: value.createdAt.toISOString(),
      }),
    ).toString('base64url');
  }

  private decodeSimpleCursor(value?: string) {
    if (!value) return null;
    try {
      const cursor = JSON.parse(
        Buffer.from(value, 'base64url').toString('utf8'),
      );
      const id = Number(cursor?.id);
      const createdAt = new Date(cursor?.createdAt);
      if (
        Number.isNaN(createdAt.getTime()) ||
        !Number.isInteger(id) ||
        id <= 0
      ) {
        throw new Error();
      }
      return { createdAt: createdAt.toISOString(), id };
    } catch {
      throw new BadRequestException('Invalid comments cursor');
    }
  }
}
