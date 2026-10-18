import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Page } from 'src/pages/entities/page.entity';
import { FollowService, fullName } from 'src/follow/follow.service';
import { PostsService } from 'src/posts/posts.service';

/** `%` and `_` typed by the user must not act as LIKE wildcards */
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, '\\$&');

export function cleanQuery(q: unknown, min = 2): string {
  const text = String(q ?? '')
    .trim()
    .replace(/^@/, '');
  if (text.length < min) {
    throw new BadRequestException(`Type at least ${min} characters to search`);
  }
  return text.slice(0, 60);
}

export function pageWindow(page?: unknown, limit?: unknown) {
  const take = Math.min(50, Math.max(1, Number(limit) || 20));
  const current = Math.max(1, Number(page) || 1);
  return { take, current, offset: (current - 1) * take };
}

@Injectable()
export class DiscoverService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Page) private readonly pageRepo: Repository<Page>,
    private readonly followService: FollowService,
    private readonly postsService: PostsService,
  ) {}

  /**
   * People search. Matches username / first / last / full name / headline.
   * Best matches first (exact username, then prefix), then most followed.
   */
  async searchUsers(
    q: string,
    viewerId: number,
    opts: { page?: unknown; limit?: unknown } = {},
  ) {
    const { take, current, offset } = pageWindow(opts.page, opts.limit);
    const safe = escapeLike(q.toLowerCase());
    const params = {
      exact: q.toLowerCase(),
      prefix: `${safe}%`,
      like: `%${safe}%`,
      viewerId,
    };

    const rows = await this.userRepo
      .createQueryBuilder('u')
      .select('u.id', 'id')
      .addSelect(
        `CASE WHEN u.username = :exact THEN 0
              WHEN u.username LIKE :prefix THEN 1
              WHEN CONCAT(u.firstName, ' ', u.lastName) LIKE :prefix THEN 2
              WHEN u.firstName LIKE :prefix OR u.lastName LIKE :prefix THEN 3
              ELSE 4 END`,
        'score',
      )
      .where('u.isBanned = false AND u.id != :viewerId')
      .andWhere(
        new Brackets((b) =>
          b
            .where('u.username LIKE :prefix')
            .orWhere('u.firstName LIKE :prefix')
            .orWhere('u.lastName LIKE :prefix')
            .orWhere("CONCAT(u.firstName, ' ', u.lastName) LIKE :like")
            .orWhere('u.headline LIKE :like'),
        ),
      )
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
    const followed = await this.followService.followedSet(
      viewerId,
      'user',
      ids,
    );

    return {
      data: ids
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((u) => ({
          ...this.followService.toPerson(u!, viewerId, followed),
          followersCount: u!.followersCount,
          open_to_work: u!.open_to_work,
        })),
      page: current,
      limit: take,
      hasMore,
    };
  }

  /** Page search: verified pages and bigger pages rank first */
  async searchPages(
    q: string,
    viewerId: number,
    opts: { page?: unknown; limit?: unknown } = {},
  ) {
    const { take, current, offset } = pageWindow(opts.page, opts.limit);
    const safe = escapeLike(q.toLowerCase());
    const params = {
      exact: q.toLowerCase(),
      prefix: `${safe}%`,
      like: `%${safe}%`,
    };

    const rows = await this.pageRepo
      .createQueryBuilder('p')
      .select('p.id', 'id')
      .addSelect(
        `CASE WHEN p.username = :exact THEN 0
              WHEN p.username LIKE :prefix OR p.page_name LIKE :prefix THEN 1
              ELSE 2 END`,
        'score',
      )
      .where(
        new Brackets((b) =>
          b
            .where('p.username LIKE :prefix')
            .orWhere('p.page_name LIKE :like')
            .orWhere('p.business_name LIKE :like')
            .orWhere('p.industry_type LIKE :like'),
        ),
      )
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
    const followed = await this.followService.followedSet(
      viewerId,
      'page',
      ids,
    );

    return {
      data: ids
        .map((id) => pages.get(id))
        .filter(Boolean)
        .map((p) => this.followService.toPageCard(p!, followed)),
      page: current,
      limit: take,
      hasMore,
    };
  }

  // ────────────────────────────────────────────────
  // POSTS / REELS / HASHTAGS
  // ────────────────────────────────────────────────

  searchPosts(
    q: string,
    viewerId: number,
    opts: { kind?: string; page?: unknown; limit?: unknown },
  ) {
    return this.postsService.search(viewerId, q, {
      kind: opts.kind,
      page: Number(opts.page) || undefined,
      limit: Number(opts.limit) || undefined,
    });
  }

  hashtags(q: string) {
    return this.postsService.hashtagSearch(q);
  }

  /** One request for the search box: a few of everything */
  async searchAll(q: string, viewerId: number) {
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

  // ────────────────────────────────────────────────
  // HOME: what to show before the person types anything
  // ────────────────────────────────────────────────

  async home(viewerId: number) {
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

  /** People I do not follow: same city first, then the most followed */
  async suggestedUsers(viewerId: number, limit = 10) {
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
      .andWhere(
        `NOT EXISTS (SELECT 1 FROM follows f
           WHERE f.followerId = :me AND f.targetType = 'user' AND f.targetId = u.id)`,
      )
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
        ...this.followService.toPerson(u!, viewerId, new Set()),
        followersCount: u!.followersCount,
      }));
  }

  /** Pages I do not follow (and do not own): verified first, then the biggest */
  async suggestedPages(viewerId: number, limit = 10) {
    const rows = await this.pageRepo
      .createQueryBuilder('p')
      .select('p.id', 'id')
      .where('p.ownerId != :me', { me: viewerId })
      .andWhere(
        `NOT EXISTS (SELECT 1 FROM follows f
           WHERE f.followerId = :me AND f.targetType = 'page' AND f.targetId = p.id)`,
      )
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
      .map((p) => this.followService.toPageCard(p!, new Set()));
  }

  // used by the other discover sections
  fullName = fullName;
}
