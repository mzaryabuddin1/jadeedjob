import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, IsNull, Repository, SelectQueryBuilder } from 'typeorm';
import { Post, PostKind, PostMedia } from './entities/post.entity';
import {
  PostHashtag,
  PostLike,
  PostShare,
} from './entities/post-engagement.entities';
import { User } from 'src/users/entities/user.entity';
import { Page } from 'src/pages/entities/page.entity';
import { PageMember } from 'src/pages/entities/page-member.entity';
import { Job } from 'src/job/entities/job.entity';
import { MediaService } from 'src/media/media.service';
import { PagesService } from 'src/pages/pages.service';
import { roleHasPermission } from 'src/pages/page-permissions';
import { isJobEmployer } from 'src/job/job-employer.util';
import { FollowService, fullName } from 'src/follow/follow.service';

export const REEL_TEXT_MAX = 2200;
export const POST_TEXT_MAX = 3000;
export const REEL_DURATION_MAX_MS = 180_000;

/** #tags in the caption - searchable and used for trending */
export function extractHashtags(text?: string | null): string[] {
  if (!text) return [];
  const tags = new Set<string>();
  for (const m of text.matchAll(/#([\p{L}\p{N}_]{2,50})/gu)) {
    tags.add(m[1].toLowerCase());
    if (tags.size >= 10) break;
  }
  return [...tags];
}

type CreateDto = {
  kind: PostKind;
  text?: string;
  mediaIds?: number[];
  thumbnailMediaId?: number;
  durationMs?: number;
  jobId?: number;
  pageId?: number;
};

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post) private readonly postRepo: Repository<Post>,
    @InjectRepository(PostHashtag)
    private readonly hashtagRepo: Repository<PostHashtag>,
    @InjectRepository(PostLike) private readonly likeRepo: Repository<PostLike>,
    @InjectRepository(PostShare)
    private readonly shareRepo: Repository<PostShare>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Page) private readonly pageRepo: Repository<Page>,
    @InjectRepository(PageMember)
    private readonly memberRepo: Repository<PageMember>,
    @InjectRepository(Job) private readonly jobRepo: Repository<Job>,
    private readonly media: MediaService,
    private readonly pagesService: PagesService,
    private readonly followService: FollowService,
  ) {}

  // ────────────────────────────────────────────────
  // PUBLISH / EDIT / DELETE
  // ────────────────────────────────────────────────

  async create(userId: number, dto: CreateDto) {
    const kind = dto.kind;
    const text = dto.text?.trim() || null;
    const mediaIds = [...new Set(dto.mediaIds ?? [])];
    const pageId = dto.pageId ?? null;

    if (pageId) {
      await this.pagesService.requirePermission(
        pageId,
        userId,
        'posts.manage',
        'publish as this page',
      );
    }

    if (kind === 'reel') {
      if (mediaIds.length !== 1) {
        throw new BadRequestException(
          'A reel needs exactly one video (mediaIds)',
        );
      }
      if (text && text.length > REEL_TEXT_MAX) {
        throw new BadRequestException(
          `A reel caption can be at most ${REEL_TEXT_MAX} characters`,
        );
      }
      if (
        dto.durationMs !== undefined &&
        (dto.durationMs < 1000 || dto.durationMs > REEL_DURATION_MAX_MS)
      ) {
        throw new BadRequestException(
          `Reel length must be between 1 and ${REEL_DURATION_MAX_MS / 1000} seconds`,
        );
      }
    } else {
      if (!text && !mediaIds.length) {
        throw new BadRequestException('A post needs some text or media');
      }
      if (text && text.length > POST_TEXT_MAX) {
        throw new BadRequestException(
          `A post can be at most ${POST_TEXT_MAX} characters`,
        );
      }
      if (mediaIds.length > 10) {
        throw new BadRequestException(
          'A post can have at most 10 images (or one video)',
        );
      }
    }
    if (dto.thumbnailMediaId && !mediaIds.length) {
      throw new BadRequestException(
        'thumbnailMediaId needs a video in mediaIds',
      );
    }

    await this.assertJobTag(userId, pageId, dto.jobId);

    const post = await this.postRepo.manager.transaction(async (m) => {
      // throws (and rolls the claim back) when a file is missing / not yours / used
      const files = await this.media.claim(
        userId,
        dto.thumbnailMediaId ? [...mediaIds, dto.thumbnailMediaId] : mediaIds,
        m,
      );
      const main = files.slice(0, mediaIds.length);
      const thumb = dto.thumbnailMediaId ? files[mediaIds.length] : null;

      const videos = main.filter((f) => f.kind === 'video');
      if (kind === 'reel' && main[0].kind !== 'video') {
        throw new BadRequestException('A reel must be a video');
      }
      if (videos.length && main.length > 1) {
        throw new BadRequestException(
          'Send either up to 10 images or a single video',
        );
      }
      if (thumb && (thumb.kind !== 'image' || !videos.length)) {
        throw new BadRequestException(
          'thumbnailMediaId must be an image for a video',
        );
      }

      const media: PostMedia[] = main.map((f) => ({
        id: f.id,
        kind: f.kind,
        url: f.url,
        mimeType: f.mimeType,
        size: f.size,
        thumbnailUrl: f.kind === 'video' ? (thumb?.url ?? null) : null,
      }));

      const saved = await m.save(
        m.create(Post, {
          kind,
          authorId: userId,
          pageId,
          text,
          media,
          durationMs: kind === 'reel' ? (dto.durationMs ?? null) : null,
          jobId: dto.jobId ?? null,
        }),
      );
      await this.saveHashtags(m, saved.id, extractHashtags(text));
      return saved;
    });

    return this.getOne(userId, post.id);
  }

  async update(
    userId: number,
    postId: number,
    dto: { text?: string; jobId?: number | null },
  ) {
    const post = await this.requirePost(postId);
    await this.assertCanManage(post, userId);

    const patch: Partial<Post> = {};
    if (dto.text !== undefined) {
      const text = dto.text.trim() || null;
      const max = post.kind === 'reel' ? REEL_TEXT_MAX : POST_TEXT_MAX;
      if (text && text.length > max) {
        throw new BadRequestException(`Text can be at most ${max} characters`);
      }
      if (!text && post.kind === 'post' && !post.media.length) {
        throw new BadRequestException('A post needs some text or media');
      }
      patch.text = text;
    }
    if (dto.jobId !== undefined) {
      await this.assertJobTag(userId, post.pageId, dto.jobId ?? undefined);
      patch.jobId = dto.jobId ?? null;
    }
    if (!Object.keys(patch).length)
      throw new BadRequestException('Nothing to update');

    await this.postRepo.manager.transaction(async (m) => {
      await m.update(Post, postId, patch);
      if (patch.text !== undefined) {
        await m.delete(PostHashtag, { postId });
        await this.saveHashtags(m, postId, extractHashtags(patch.text));
      }
    });

    return this.getOne(userId, postId);
  }

  async remove(userId: number, postId: number) {
    const post = await this.requirePost(postId);
    await this.assertCanManage(post, userId);
    await this.postRepo.update(postId, { deletedAt: new Date() });
    return { message: 'Post deleted' };
  }

  private async saveHashtags(m: any, postId: number, tags: string[]) {
    if (tags.length) {
      await m.insert(
        PostHashtag,
        tags.map((tag) => ({ postId, tag })),
      );
    }
  }

  /** You can promote your own jobs (or, as a page, that page's jobs) */
  private async assertJobTag(
    userId: number,
    pageId: number | null,
    jobId?: number,
  ) {
    if (!jobId) return;
    const job = await this.jobRepo.findOne({
      where: { id: jobId, isActive: true },
      select: ['id', 'createdBy', 'pageId'],
    });
    if (!job) throw new BadRequestException('Job not found or not active');

    if (pageId) {
      if (job.pageId !== pageId) {
        throw new BadRequestException('A page can only tag its own jobs');
      }
    } else if (!(await isJobEmployer(this.pageRepo, job, userId))) {
      throw new BadRequestException('You can only tag your own jobs');
    }
  }

  // ────────────────────────────────────────────────
  // ACCESS
  // ────────────────────────────────────────────────

  async requirePost(id: number): Promise<Post> {
    const post = await this.postRepo.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!post) throw new NotFoundException('Post not found');
    const author = await this.userRepo.findOne({
      where: { id: post.authorId },
      select: ['id', 'isBanned'],
    });
    if (!author || author.isBanned)
      throw new NotFoundException('Post not found');
    return post;
  }

  /** Personal post: its author. Page post: page owner / admin / editor (posts.manage) */
  async canManage(post: Post, userId: number): Promise<boolean> {
    if (!post.pageId) return post.authorId === userId;
    const page = await this.pagesService.requirePage(post.pageId);
    return roleHasPermission(
      this.pagesService.roleOf(page, userId),
      'posts.manage',
    );
  }

  private async assertCanManage(post: Post, userId: number) {
    if (!(await this.canManage(post, userId))) {
      throw new ForbiddenException('You cannot change this post');
    }
  }

  // ────────────────────────────────────────────────
  // READ
  // ────────────────────────────────────────────────

  async getOne(viewerId: number, id: number) {
    const post = await this.requirePost(id);
    return (await this.hydrate([post], viewerId))[0];
  }

  /** A person's own posts/reels (not the ones they published as a page) */
  async listByUser(
    viewerId: number,
    userId: number,
    opts: { kind?: string; before?: number; limit?: number },
  ) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'isBanned'],
    });
    if (!user || user.isBanned) throw new NotFoundException('User not found');

    return this.chronological(viewerId, opts, (qb) =>
      qb.andWhere('p.authorId = :userId AND p.pageId IS NULL', { userId }),
    );
  }

  async listByPage(
    viewerId: number,
    pageId: number,
    opts: { kind?: string; before?: number; limit?: number },
  ) {
    if (!(await this.pageRepo.exist({ where: { id: pageId } }))) {
      throw new NotFoundException('Page not found');
    }
    return this.chronological(viewerId, opts, (qb) =>
      qb.andWhere('p.pageId = :pageId', { pageId }),
    );
  }

  /** Posts + reels of everybody I follow (people and pages) and my own, newest first */
  async feed(
    viewerId: number,
    opts: { kind?: string; before?: number; limit?: number },
  ) {
    return this.chronological(viewerId, opts, (qb) =>
      qb
        .andWhere(
          new Brackets((b) =>
            b
              .where(
                `(p.pageId IS NULL AND (p.authorId = :me OR EXISTS (
                 SELECT 1 FROM follows f
                 WHERE f.followerId = :me AND f.targetType = 'user' AND f.targetId = p.authorId)))`,
              )
              .orWhere(
                `(p.pageId IS NOT NULL AND EXISTS (
                 SELECT 1 FROM follows f
                 WHERE f.followerId = :me AND f.targetType = 'page' AND f.targetId = p.pageId))`,
              ),
          ),
        )
        .setParameter('me', viewerId),
    );
  }

  /**
   * Public reels ranked by how well they are doing right now:
   * (likes + 3*comments + 5*shares + 0.2*views) decayed by age, last 30 days.
   * Ranking moves, so paging is by page number.
   */
  async reelsFeed(viewerId: number, opts: { page?: number; limit?: number }) {
    const take = Math.min(30, Math.max(1, Number(opts.limit) || 10));
    const current = Math.max(1, Number(opts.page) || 1);

    const rows = await this.visible(
      this.postRepo.createQueryBuilder('p').where("p.kind = 'reel'"),
    )
      .andWhere('p.createdAt > NOW() - INTERVAL 30 DAY')
      .select('p.id', 'id')
      .addSelect(
        `(p.likesCount + p.commentsCount * 3 + p.sharesCount * 5 + p.viewsCount * 0.2 + 1)
           / POW(TIMESTAMPDIFF(HOUR, p.createdAt, NOW()) + 2, 1.4)`,
        'score',
      )
      .orderBy('score', 'DESC')
      .addOrderBy('p.id', 'DESC')
      .offset((current - 1) * take)
      .limit(take + 1)
      .getRawMany();

    const hasMore = rows.length > take;
    const ids = rows.slice(0, take).map((r) => Number(r.id));
    const posts = ids.length
      ? await this.postRepo.find({ where: { id: In(ids) } })
      : [];
    const byId = new Map(posts.map((p) => [p.id, p]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as Post[];

    return {
      data: await this.hydrate(ordered, viewerId),
      page: current,
      limit: take,
      hasMore,
    };
  }

  /** newest first, cursor = post id */
  private async chronological(
    viewerId: number,
    opts: { kind?: string; before?: number; limit?: number },
    scope: (qb: SelectQueryBuilder<Post>) => SelectQueryBuilder<Post>,
  ) {
    const limit = Math.min(30, Math.max(1, Number(opts.limit) || 10));
    const qb = this.visible(
      this.postRepo.createQueryBuilder('p').where('1 = 1'),
    );
    scope(qb);
    if (opts.kind === 'post' || opts.kind === 'reel') {
      qb.andWhere('p.kind = :kind', { kind: opts.kind });
    }
    if (opts.before) qb.andWhere('p.id < :before', { before: opts.before });
    qb.orderBy('p.id', 'DESC').take(limit + 1);

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);

    return {
      data: await this.hydrate(page, viewerId),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  /** not deleted, and the author is not banned */
  visible<T extends SelectQueryBuilder<Post>>(qb: T): T {
    return qb
      .andWhere('p.deletedAt IS NULL')
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM users ub WHERE ub.id = p.authorId AND ub.isBanned = 1)',
      ) as T;
  }

  // ────────────────────────────────────────────────
  // SEARCH + HASHTAGS
  // ────────────────────────────────────────────────

  /**
   * Search posts and reels by words in the text or by hashtag (`#hiring`
   * matches posts tagged hiring). Popular and recent first.
   */
  async search(
    viewerId: number,
    q: string,
    opts: { kind?: string; page?: number; limit?: number },
  ) {
    const take = Math.min(30, Math.max(1, Number(opts.limit) || 10));
    const current = Math.max(1, Number(opts.page) || 1);
    const word = q.replace(/^#/, '').toLowerCase();
    const safe = word.replace(/[\\%_]/g, '\\$&');

    const qb = this.visible(
      this.postRepo.createQueryBuilder('p').where('1 = 1'),
    );
    if (q.startsWith('#')) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM post_hashtags h WHERE h.postId = p.id AND h.tag = :tag)',
        { tag: word },
      );
    } else {
      qb.andWhere(
        new Brackets((b) =>
          b
            .where('p.text LIKE :like', { like: `%${safe}%` })
            .orWhere(
              'EXISTS (SELECT 1 FROM post_hashtags h WHERE h.postId = p.id AND h.tag LIKE :prefix)',
              { prefix: `${safe}%` },
            ),
        ),
      );
    }
    if (opts.kind === 'post' || opts.kind === 'reel') {
      qb.andWhere('p.kind = :kind', { kind: opts.kind });
    }

    const rows = await qb
      .select('p.id', 'id')
      .addSelect(
        `(p.likesCount + p.commentsCount * 3 + p.sharesCount * 5 + p.viewsCount * 0.2 + 1)
           / POW(TIMESTAMPDIFF(HOUR, p.createdAt, NOW()) + 2, 1.2)`,
        'score',
      )
      .orderBy('score', 'DESC')
      .addOrderBy('p.id', 'DESC')
      .offset((current - 1) * take)
      .limit(take + 1)
      .getRawMany();

    const hasMore = rows.length > take;
    const ids = rows.slice(0, take).map((r) => Number(r.id));
    const posts = ids.length
      ? await this.postRepo.find({ where: { id: In(ids) } })
      : [];
    const byId = new Map(posts.map((p) => [p.id, p]));

    return {
      data: await this.hydrate(
        ids.map((id) => byId.get(id)).filter(Boolean) as Post[],
        viewerId,
      ),
      page: current,
      limit: take,
      hasMore,
    };
  }

  /** hashtag typeahead: tags starting with `prefix`, with their number of live posts */
  async hashtagSearch(prefix: string, limit = 10) {
    const safe = prefix
      .replace(/^#/, '')
      .toLowerCase()
      .replace(/[\\%_]/g, '\\$&');
    const rows = await this.hashtagRepo
      .createQueryBuilder('h')
      .innerJoin(Post, 'p', 'p.id = h.postId AND p.deletedAt IS NULL')
      .select('h.tag', 'tag')
      .addSelect('COUNT(*)', 'posts')
      .where('h.tag LIKE :prefix', { prefix: `${safe}%` })
      .groupBy('h.tag')
      .orderBy('posts', 'DESC')
      .addOrderBy('h.tag', 'ASC')
      .limit(Math.min(30, Math.max(1, limit)))
      .getRawMany();
    return rows.map((r) => ({ tag: r.tag as string, posts: Number(r.posts) }));
  }

  /** most used hashtags over the last `days` days */
  async trendingHashtags(days = 3, limit = 10) {
    const rows = await this.hashtagRepo
      .createQueryBuilder('h')
      .innerJoin(Post, 'p', 'p.id = h.postId AND p.deletedAt IS NULL')
      .select('h.tag', 'tag')
      .addSelect('COUNT(*)', 'posts')
      .where('p.createdAt > NOW() - INTERVAL :days DAY', {
        days: Math.max(1, days),
      })
      .groupBy('h.tag')
      .orderBy('posts', 'DESC')
      .addOrderBy('h.tag', 'ASC')
      .limit(Math.min(30, Math.max(1, limit)))
      .getRawMany();
    return rows.map((r) => ({ tag: r.tag as string, posts: Number(r.posts) }));
  }

  // ────────────────────────────────────────────────
  // HYDRATION: raw rows -> what the app renders
  // ────────────────────────────────────────────────

  async hydrate(posts: Post[], viewerId: number) {
    if (!posts.length) return [];
    const ids = posts.map((p) => p.id);
    const authorIds = posts.map((p) => p.authorId);
    const pageIds = posts.map((p) => p.pageId).filter(Boolean) as number[];
    const jobIds = posts.map((p) => p.jobId).filter(Boolean) as number[];

    const [
      authors,
      pages,
      jobs,
      myLikes,
      myShares,
      followedUsers,
      followedPages,
      roles,
    ] = await Promise.all([
      this.followService.usersById(authorIds),
      this.followService.pagesById(pageIds),
      this.jobsById(jobIds),
      this.likeRepo.find({
        where: { userId: viewerId, postId: In(ids) },
        select: ['postId'],
      }),
      this.shareRepo.find({
        where: { userId: viewerId, postId: In(ids) },
        select: ['postId'],
      }),
      this.followService.followedSet(viewerId, 'user', authorIds),
      this.followService.followedSet(viewerId, 'page', pageIds),
      this.pageRoles(pageIds, viewerId),
    ]);
    const liked = new Set(myLikes.map((l) => l.postId));
    const shared = new Set(myShares.map((s) => s.postId));
    const tags = await this.hashtagRepo.find({ where: { postId: In(ids) } });
    const tagsByPost = new Map<number, string[]>();
    for (const t of tags) {
      tagsByPost.set(t.postId, [...(tagsByPost.get(t.postId) ?? []), t.tag]);
    }

    return posts.map((p) => {
      const author = authors.get(p.authorId);
      const page = p.pageId ? pages.get(p.pageId) : null;
      const job = p.jobId ? jobs.get(p.jobId) : null;
      return {
        id: p.id,
        kind: p.kind,
        publishedAs: p.pageId ? 'page' : 'user',
        text: p.text,
        media: p.media,
        durationMs: p.durationMs,
        hashtags: tagsByPost.get(p.id) ?? [],
        author: author
          ? {
              id: author.id,
              name: fullName(author),
              username: author.username,
              profile_photo: author.profile_photo,
              headline: author.headline,
              isFollowing: followedUsers.has(author.id),
              isMe: author.id === viewerId,
            }
          : null,
        page: page
          ? {
              id: page.id,
              page_name: page.page_name,
              username: page.username,
              page_logo: page.page_logo,
              is_verified: !!page.is_verified,
              isFollowing: followedPages.has(page.id),
            }
          : null,
        job: job ?? null,
        counts: {
          likes: p.likesCount,
          comments: p.commentsCount,
          shares: p.sharesCount,
          views: p.viewsCount,
        },
        viewer: {
          liked: liked.has(p.id),
          shared: shared.has(p.id),
          canManage: p.pageId
            ? roleHasPermission(roles.get(p.pageId), 'posts.manage')
            : p.authorId === viewerId,
        },
        createdAt: p.createdAt,
      };
    });
  }

  private async jobsById(ids: number[]) {
    const unique = [...new Set(ids)];
    if (!unique.length) return new Map<number, any>();
    const jobs = await this.jobRepo
      .createQueryBuilder('j')
      .select([
        'j.id',
        'j.title',
        'j.salaryType',
        'j.salaryAmount',
        'j.currency',
        'j.isRemote',
        'j.isActive',
        'j.pageId',
      ])
      .whereInIds(unique)
      .getMany();
    return new Map(
      jobs.map((j) => [
        j.id,
        {
          id: j.id,
          title: j.title,
          salaryType: j.salaryType,
          salaryAmount: j.salaryAmount,
          currency: j.currency,
          isRemote: j.isRemote,
          isActive: j.isActive,
        },
      ]),
    );
  }

  /** viewer's role on each of these pages */
  private async pageRoles(pageIds: number[], userId: number) {
    const roles = new Map<number, string>();
    const unique = [...new Set(pageIds)];
    if (!unique.length) return roles;

    const owned = await this.pageRepo.find({
      where: { id: In(unique), ownerId: userId },
      select: ['id'],
    });
    for (const p of owned) roles.set(p.id, 'owner');

    const members = await this.memberRepo.find({
      where: { userId, pageId: In(unique) },
    });
    for (const m of members)
      if (!roles.has(m.pageId)) roles.set(m.pageId, m.role);
    return roles;
  }
}
