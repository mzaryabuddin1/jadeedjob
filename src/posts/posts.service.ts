import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { Job } from 'src/job/entities/job.entity';
import { normalizeCompanyPermissions } from 'src/pages/company-permissions';
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

type PostFeedQuery = {
  cursor?: string;
  limit?: number;
  publisherType?: PostPublisherType;
  publisherId?: number;
};

type PostMutationBody = {
  publisherType?: PostPublisherType;
  publisherId?: number | string;
  body?: string | null;
  linkedJobId?: number | string | null;
  allowComments?: boolean | string;
  removeImage?: boolean | string;
};

type FeedCursor =
  | { mode: 'feed'; score: number; id: number }
  | { mode: 'profile'; createdAt: string; id: number };

@Injectable()
export class PostsService {
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
    private readonly pagesService: PagesService,
    private readonly storage: PostStorageService,
  ) {}

  async getFeed(query: PostFeedQuery, viewerId: number) {
    const limit = Math.min(30, Math.max(1, Number(query.limit) || 10));
    const profileFiltered = Boolean(query.publisherType && query.publisherId);
    const cursor = this.decodeCursor(query.cursor);
    const qb = this.createViewableQuery();

    if (profileFiltered) {
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

  async getPost(postId: number, viewerId: number) {
    return this.formatPost(
      await this.getViewablePostOrThrow(postId),
      viewerId,
    );
  }

  async createPost(
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
      }),
    );

    if (image) {
      try {
        const stored = await this.storage.save(post.id, image);
        post.imageUrl = stored.publicUrl;
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
    if (image && removeImage) {
      throw new BadRequestException(
        'Choose a replacement image or remove the current image, not both',
      );
    }

    const hasBody = data.body !== undefined;
    const hasLinkedJob = data.linkedJobId !== undefined;
    const hasComments = data.allowComments !== undefined;
    if (!hasBody && !hasLinkedJob && !hasComments && !removeImage && !image) {
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

    const oldStorageKey = post.imageStorageKey;
    if (removeImage) {
      post.imageUrl = null;
      post.imageStorageKey = null;
    }

    let newStorageKey: string | null = null;
    if (image) {
      const stored = await this.storage.save(post.id, image);
      newStorageKey = stored.storageKey;
      post.imageUrl = stored.publicUrl;
      post.imageStorageKey = stored.storageKey;
    }

    if (!post.body && !post.imageUrl) {
      if (newStorageKey) await this.storage.remove(newStorageKey);
      throw new BadRequestException('A post needs text or an image');
    }

    try {
      await this.postRepo.save(post);
    } catch (error) {
      if (newStorageKey) await this.storage.remove(newStorageKey);
      throw error;
    }

    if ((removeImage || image) && oldStorageKey !== post.imageStorageKey) {
      await this.storage.remove(oldStorageKey);
    }

    return this.formatPost(await this.getPostByIdOrThrow(postId), userId);
  }

  async deletePost(postId: number, userId: number) {
    const post = await this.getPostByIdOrThrow(postId);
    await this.assertCanManage(post, userId);
    post.deletedAt = new Date();
    await this.postRepo.save(post);
    await this.storage.remove(post.imageStorageKey);
    return { id: String(post.id), deleted: true };
  }

  async like(postId: number, userId: number) {
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

  async unlike(postId: number, userId: number) {
    await this.getViewablePostOrThrow(postId);
    const result = await this.likeRepo.delete({ postId, userId });
    if (result.affected) await this.decrementCounter(postId, 'likesCount');
    return this.getPost(postId, userId);
  }

  async save(postId: number, userId: number) {
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

  async unsave(postId: number, userId: number) {
    await this.getViewablePostOrThrow(postId);
    const result = await this.saveRepo.delete({ postId, userId });
    if (result.affected) await this.decrementCounter(postId, 'savesCount');
    return this.getPost(postId, userId);
  }

  async share(postId: number, userId: number) {
    await this.getViewablePostOrThrow(postId);
    await this.postRepo.increment({ id: postId }, 'sharesCount', 1);
    return this.getPost(postId, userId);
  }

  async getComments(
    postId: number,
    viewerId: number,
    cursor?: string,
    limit = 20,
  ) {
    await this.getViewablePostOrThrow(postId);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
    const decoded = this.decodeSimpleCursor(cursor);
    const qb = this.commentRepo
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .where('comment.postId = :postId', { postId })
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
      data: pageItems.map((comment) => this.formatComment(comment)),
      nextCursor:
        hasMore && pageItems.length
          ? this.encodeSimpleCursor(pageItems[pageItems.length - 1])
          : null,
    };
  }

  async addComment(postId: number, userId: number, text: string) {
    const post = await this.getViewablePostOrThrow(postId);
    if (!post.allowComments) {
      throw new BadRequestException('Comments are disabled for this post');
    }

    const comment = await this.commentRepo.save(
      this.commentRepo.create({ postId, userId, text: text.trim() }),
    );
    await this.postRepo.increment({ id: postId }, 'commentsCount', 1);
    return this.formatComment(
      await this.commentRepo.findOne({
        where: { id: comment.id },
        relations: ['user'],
      }),
    );
  }

  async report(
    postId: number,
    userId: number,
    reason = 'other',
    details?: string,
  ) {
    const post = await this.getViewablePostOrThrow(postId);
    if (post.creatorId === userId) {
      throw new BadRequestException('You cannot report your own post');
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

  private createViewableQuery() {
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

  private async getViewablePostOrThrow(postId: number) {
    const post = await this.createViewableQuery()
      .andWhere('post.id = :postId', { postId })
      .getOne();
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
    const active = Boolean(
      job?.isActive && (!job.status || job.status === 'active'),
    );
    const companyViewable =
      job?.postingMode !== 'company' ||
      !job.pageId ||
      job.page?.verificationStatus === 'approved';
    if (!job || !active || !companyViewable) {
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
    if (post.creatorId === userId) return;
    if (this.getPublisherType(post) !== 'company' || !post.publisherCompanyId) {
      throw new ForbiddenException('You cannot manage this post');
    }

    const access = await this.pagesService.getCompanyAccess(
      post.publisherCompanyId,
      userId,
      'publishContent',
    );
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

    const [likes, saves, userFollows, companyFollows, manageableCompanies] =
      await Promise.all([
        this.likeRepo.find({ where: { postId: In(postIds), userId: viewerId } }),
        this.saveRepo.find({ where: { postId: In(postIds), userId: viewerId } }),
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
        this.pagesService.getManageablePublishingCompanyIds(
          viewerId,
          companyPublisherIds,
        ),
      ]);

    const likedIds = new Set(likes.map((like) => like.postId));
    const savedIds = new Set(saves.map((save) => save.postId));
    const followed = new Set(
      [...userFollows, ...companyFollows].map(
        (follow) => `${follow.profileType}:${follow.profileId}`,
      ),
    );
    const manageableCompanyIds = new Set(manageableCompanies);

    return posts.map((post) => ({
      ...this.formatPostBase(post),
      viewerState: {
        liked: likedIds.has(post.id),
        saved: savedIds.has(post.id),
        followingPublisher: followed.has(
          `${this.getPublisherType(post)}:${this.getPublisherId(post)}`,
        ),
        isOwner: post.creatorId === viewerId,
        canManage:
          post.creatorId === viewerId ||
          (this.getPublisherType(post) === 'company' &&
            manageableCompanyIds.has(Number(post.publisherCompanyId))),
      },
    }));
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

  private formatPostBase(post: CommunityPost) {
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

  private formatComment(comment: PostComment | null) {
    if (!comment) return null;
    return {
      id: String(comment.id),
      postId: String(comment.postId),
      author: formatUserPublisher(comment.user),
      text: comment.text,
      createdAt: comment.createdAt,
    };
  }

  private async canManage(post: CommunityPost, viewerId: number) {
    if (post.creatorId === viewerId) return true;
    if (this.getPublisherType(post) !== 'company' || !post.publisherCompanyId) {
      return false;
    }
    try {
      const access = await this.pagesService.getCompanyAccess(
        post.publisherCompanyId,
        viewerId,
      );
      const permissions = normalizeCompanyPermissions(
        access.member.role,
        access.member.permissions,
      );
      return (
        (access.member.role === 'owner' || access.member.role === 'admin') &&
        permissions.publishContent
      );
    } catch {
      return false;
    }
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

  private normalizeBody(value?: string | null) {
    const body = typeof value === 'string' ? value.trim() : '';
    if (body.length > 2000) {
      throw new BadRequestException('Post text must be 2,000 characters or less');
    }
    return body || null;
  }

  private parseBoolean(value: boolean | string | undefined, fallback: boolean) {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return fallback;
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

  private encodeCursor(cursor: FeedCursor) {
    return Buffer.from(JSON.stringify(cursor)).toString('base64url');
  }

  private decodeCursor(value?: string): FeedCursor | null {
    if (!value) return null;
    try {
      const cursor = JSON.parse(
        Buffer.from(value, 'base64url').toString('utf8'),
      );
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
    } catch {
      throw new BadRequestException('Invalid post cursor');
    }
    throw new BadRequestException('Invalid post cursor');
  }

  private encodeSimpleCursor(value: { id: number; createdAt: Date }) {
    return Buffer.from(
      JSON.stringify({ id: value.id, createdAt: value.createdAt.toISOString() }),
    ).toString('base64url');
  }

  private decodeSimpleCursor(value?: string) {
    if (!value) return null;
    try {
      const cursor = JSON.parse(
        Buffer.from(value, 'base64url').toString('utf8'),
      );
      if (!cursor?.createdAt || !Number(cursor.id)) throw new Error();
      return { createdAt: String(cursor.createdAt), id: Number(cursor.id) };
    } catch {
      throw new BadRequestException('Invalid comments cursor');
    }
  }
}
