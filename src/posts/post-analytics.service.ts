import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import {
  PostStatsDaily,
  PostViewer,
} from './entities/post-engagement.entities';
import { PostsService } from './posts.service';
import { PostStatsService } from './post-stats.service';
import { Follow } from 'src/follow/follow.entity';
import { User } from 'src/users/entities/user.entity';
import { Page } from 'src/pages/entities/page.entity';
import { PagesService } from 'src/pages/pages.service';
import { roleHasPermission } from 'src/pages/page-permissions';

export type ViewEvent = {
  postId: number;
  /** `impression`: it appeared in a feed. `view`: the person actually watched / opened it */
  type: 'impression' | 'view';
  watchMs?: number;
  completed?: boolean;
};

const MAX_WATCH_MS = 10 * 60 * 1000;
const dayString = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Performance numbers of posts and reels.
 *
 * The app reports what happened (`POST /posts/events`, batched); likes,
 * comments and shares are counted by the engagement endpoints themselves.
 * Everything lands in per-post per-UTC-day rows, so any period is a cheap
 * sum - no scanning of raw events.
 */
@Injectable()
export class PostAnalyticsService {
  constructor(
    @InjectRepository(Post) private readonly postRepo: Repository<Post>,
    @InjectRepository(PostStatsDaily)
    private readonly statsRepo: Repository<PostStatsDaily>,
    @InjectRepository(Follow) private readonly followRepo: Repository<Follow>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Page) private readonly pageRepo: Repository<Page>,
    private readonly posts: PostsService,
    private readonly stats: PostStatsService,
    private readonly pagesService: PagesService,
  ) {}

  // ────────────────────────────────────────────────
  // RECORD (called by the app, batched to save requests)
  // ────────────────────────────────────────────────

  async record(viewerId: number, events: ViewEvent[]) {
    const ids = [...new Set(events.map((e) => e.postId))];
    const found = ids.length
      ? await this.postRepo.find({
          where: { id: In(ids), deletedAt: IsNull() },
          select: ['id', 'authorId', 'durationMs'],
        })
      : [];
    const byId = new Map(found.map((p) => [p.id, p]));

    // per post totals for this batch
    const acc = new Map<
      number,
      { impressions: number; views: number; watch: number; completions: number }
    >();
    let ignored = 0;
    for (const e of events) {
      const post = byId.get(e.postId);
      // unknown / deleted posts and people viewing their own content do not count
      if (!post || post.authorId === viewerId) {
        ignored++;
        continue;
      }
      const a = acc.get(post.id) ?? {
        impressions: 0,
        views: 0,
        watch: 0,
        completions: 0,
      };
      if (e.type === 'impression') {
        a.impressions++;
      } else {
        a.views++;
        // watching can loop a short reel, but never count more than 3 plays or 10 minutes
        const cap = Math.min(
          MAX_WATCH_MS,
          (post.durationMs ?? MAX_WATCH_MS) * 3,
        );
        a.watch += Math.max(0, Math.min(Number(e.watchMs) || 0, cap));
        if (e.completed) a.completions++;
      }
      acc.set(post.id, a);
    }

    for (const [postId, a] of acc) {
      let newViewer = false;
      if (a.views > 0) {
        // first view ever by this person = +1 reach (INSERT IGNORE: race safe)
        const res = await this.postRepo.manager
          .createQueryBuilder()
          .insert()
          .into(PostViewer)
          .values({ postId, userId: viewerId, firstSeenAt: new Date() })
          .orIgnore()
          .updateEntity(false)
          .execute();
        newViewer = (res.raw?.affectedRows ?? 0) > 0;
      }

      await this.postRepo
        .createQueryBuilder()
        .update(Post)
        .set({
          impressionsCount: () => `impressionsCount + ${a.impressions}`,
          viewsCount: () => `viewsCount + ${a.views}`,
          watchTimeMs: () => `watchTimeMs + ${a.watch}`,
          completionsCount: () => `completionsCount + ${a.completions}`,
          reachCount: () => `reachCount + ${newViewer ? 1 : 0}`,
        })
        .where('id = :postId', { postId })
        .execute();

      await this.stats.bump(postId, {
        impressions: a.impressions,
        views: a.views,
        newViewers: newViewer ? 1 : 0,
        watchTimeMs: a.watch,
        completions: a.completions,
      });
    }

    return { accepted: events.length - ignored, ignored };
  }

  // ────────────────────────────────────────────────
  // ONE POST
  // ────────────────────────────────────────────────

  /** Personal post: its author. Page post: owner / admin (analytics.view) */
  private async assertCanSee(post: Post, userId: number) {
    if (post.pageId) {
      const page = await this.pagesService.requirePage(post.pageId);
      if (
        !roleHasPermission(
          this.pagesService.roleOf(page, userId),
          'analytics.view',
        )
      ) {
        throw new ForbiddenException(
          'Only the page owner or admins can see analytics',
        );
      }
    } else if (post.authorId !== userId) {
      throw new ForbiddenException('Only the author can see analytics');
    }
  }

  private period(days: number) {
    const n = Math.min(90, Math.max(1, Number(days) || 7));
    const to = new Date();
    const from = new Date(to.getTime() - (n - 1) * 86_400_000);
    const list: string[] = [];
    for (let i = 0; i < n; i++) {
      list.push(dayString(new Date(from.getTime() + i * 86_400_000)));
    }
    return { days: n, from: list[0], to: list[list.length - 1], list };
  }

  async postAnalytics(userId: number, postId: number, days: number) {
    const post = await this.posts.requirePost(postId);
    await this.assertCanSee(post, userId);

    const p = this.period(days);
    const rows = await this.statsRepo
      .createQueryBuilder('s')
      .select("DATE_FORMAT(s.day, '%Y-%m-%d')", 'day')
      .addSelect('s.impressions', 'impressions')
      .addSelect('s.views', 'views')
      .addSelect('s.newViewers', 'newViewers')
      .addSelect('s.watchTimeMs', 'watchTimeMs')
      .addSelect('s.completions', 'completions')
      .addSelect('s.likes', 'likes')
      .addSelect('s.comments', 'comments')
      .addSelect('s.shares', 'shares')
      .where('s.postId = :postId AND s.day >= :from', { postId, from: p.from })
      .getRawMany();

    const byDay = new Map(rows.map((r) => [r.day as string, r]));
    const daily = p.list.map((day) => {
      const r = byDay.get(day);
      return {
        day,
        impressions: Number(r?.impressions ?? 0),
        views: Number(r?.views ?? 0),
        newViewers: Number(r?.newViewers ?? 0),
        watchTimeMs: Number(r?.watchTimeMs ?? 0),
        completions: Number(r?.completions ?? 0),
        likes: Number(r?.likes ?? 0),
        comments: Number(r?.comments ?? 0),
        shares: Number(r?.shares ?? 0),
      };
    });

    const totals = this.sum(daily);
    return {
      post: {
        id: post.id,
        kind: post.kind,
        text: post.text,
        thumbnail: post.media[0]?.thumbnailUrl ?? post.media[0]?.url ?? null,
        createdAt: post.createdAt,
      },
      period: { days: p.days, from: p.from, to: p.to },
      totals,
      rates: this.rates(totals),
      lifetime: {
        impressions: post.impressionsCount,
        views: post.viewsCount,
        reach: post.reachCount,
        likes: post.likesCount,
        comments: post.commentsCount,
        shares: post.sharesCount,
        watchTimeMs: post.watchTimeMs,
        completions: post.completionsCount,
      },
      daily,
    };
  }

  private sum(
    rows: {
      impressions: number;
      views: number;
      newViewers: number;
      watchTimeMs: number;
      completions: number;
      likes: number;
      comments: number;
      shares: number;
    }[],
  ) {
    const t = {
      impressions: 0,
      views: 0,
      newViewers: 0,
      watchTimeMs: 0,
      completions: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    };
    for (const r of rows)
      for (const k of Object.keys(t) as (keyof typeof t)[]) t[k] += r[k];
    return t;
  }

  /**
   * - viewRate: views / impressions
   * - avgWatchMs: watch time per view
   * - completionRate: completed views / views (reels)
   * - engagementRate: (likes + comments + shares) / views
   */
  private rates(t: ReturnType<PostAnalyticsService['sum']>) {
    const round = (n: number) => Math.round(n * 10000) / 10000;
    return {
      viewRate: t.impressions ? round(t.views / t.impressions) : 0,
      avgWatchMs: t.views ? Math.round(t.watchTimeMs / t.views) : 0,
      completionRate: t.views ? round(t.completions / t.views) : 0,
      engagementRate: t.views
        ? round((t.likes + t.comments + t.shares) / t.views)
        : 0,
    };
  }

  // ────────────────────────────────────────────────
  // WHOLE ACCOUNT / PAGE
  // ────────────────────────────────────────────────

  /** Everything the person (or the page) published, over the last `days` days */
  async overview(userId: number, days: number, pageId?: number) {
    let scope: string;
    let followTarget: { type: 'user' | 'page'; id: number };
    let followers: number;
    if (pageId) {
      const page = await this.pagesService.requirePage(pageId);
      if (
        !roleHasPermission(
          this.pagesService.roleOf(page, userId),
          'analytics.view',
        )
      ) {
        throw new ForbiddenException(
          'Only the page owner or admins can see analytics',
        );
      }
      scope = 'p.pageId = :scopeId';
      followTarget = { type: 'page', id: pageId };
      followers = page.followersCount;
    } else {
      const me = await this.userRepo.findOneOrFail({
        where: { id: userId },
        select: ['id', 'followersCount'],
      });
      scope = 'p.authorId = :scopeId AND p.pageId IS NULL';
      followTarget = { type: 'user', id: userId };
      followers = me.followersCount;
    }
    const scopeId = pageId ?? userId;
    const per = this.period(days);

    const base = () =>
      this.statsRepo
        .createQueryBuilder('s')
        .innerJoin(Post, 'p', 'p.id = s.postId')
        .where(scope, { scopeId })
        .andWhere('s.day >= :from', { from: per.from });

    const sums = [
      'SUM(s.impressions) AS impressions',
      'SUM(s.views) AS views',
      'SUM(s.newViewers) AS newViewers',
      'SUM(s.watchTimeMs) AS watchTimeMs',
      'SUM(s.completions) AS completions',
      'SUM(s.likes) AS likes',
      'SUM(s.comments) AS comments',
      'SUM(s.shares) AS shares',
    ];
    const toNums = (r: any) => ({
      impressions: Number(r?.impressions ?? 0),
      views: Number(r?.views ?? 0),
      newViewers: Number(r?.newViewers ?? 0),
      watchTimeMs: Number(r?.watchTimeMs ?? 0),
      completions: Number(r?.completions ?? 0),
      likes: Number(r?.likes ?? 0),
      comments: Number(r?.comments ?? 0),
      shares: Number(r?.shares ?? 0),
    });

    const dailyRows = await base()
      .select("DATE_FORMAT(s.day, '%Y-%m-%d')", 'day')
      .addSelect(sums)
      .groupBy('s.day')
      .getRawMany();
    const byDay = new Map(dailyRows.map((r) => [r.day as string, toNums(r)]));
    const empty = toNums({});
    const daily = per.list.map((day) => ({
      day,
      ...(byDay.get(day) ?? empty),
    }));
    const totals = this.sum(daily);

    const kindRows = await base()
      .select('p.kind', 'kind')
      .addSelect(sums)
      .groupBy('p.kind')
      .getRawMany();
    const byKind: Record<string, any> = { post: toNums({}), reel: toNums({}) };
    for (const r of kindRows) byKind[r.kind] = toNums(r);

    const topRows = await base()
      .andWhere('p.deletedAt IS NULL')
      .select('p.id', 'id')
      .addSelect('SUM(s.views)', 'views')
      .addSelect('SUM(s.likes + s.comments + s.shares)', 'interactions')
      .groupBy('p.id')
      .orderBy('views', 'DESC')
      .addOrderBy('p.id', 'DESC')
      .limit(5)
      .getRawMany();
    const topPosts = topRows.length
      ? await this.postRepo.find({
          where: { id: In(topRows.map((r) => Number(r.id))) },
        })
      : [];
    const topById = new Map(topPosts.map((p) => [p.id, p]));

    // followers gained per day, straight from the follow rows
    const gainedRows = await this.followRepo
      .createQueryBuilder('f')
      .select("DATE_FORMAT(f.createdAt, '%Y-%m-%d')", 'day')
      .addSelect('COUNT(*)', 'n')
      .where(
        'f.targetType = :t AND f.targetId = :id AND f.createdAt >= :from',
        {
          t: followTarget.type,
          id: followTarget.id,
          from: new Date(`${per.from}T00:00:00.000Z`),
        },
      )
      .groupBy('day')
      .getRawMany();
    const gainedByDay = new Map(
      gainedRows.map((r) => [r.day as string, Number(r.n)]),
    );

    const published = await this.postRepo
      .createQueryBuilder('p')
      .where(scope, { scopeId })
      .andWhere('p.deletedAt IS NULL AND p.createdAt >= :from', {
        from: new Date(`${per.from}T00:00:00.000Z`),
      })
      .getCount();

    return {
      scope: pageId ? { type: 'page', pageId } : { type: 'user', userId },
      period: { days: per.days, from: per.from, to: per.to },
      totals,
      rates: this.rates(totals),
      byKind,
      followers: {
        total: followers,
        gained: [...gainedByDay.values()].reduce((a, b) => a + b, 0),
        daily: per.list.map((day) => ({
          day,
          gained: gainedByDay.get(day) ?? 0,
        })),
      },
      published,
      topPosts: topRows
        .map((r) => {
          const p = topById.get(Number(r.id));
          return p
            ? {
                id: p.id,
                kind: p.kind,
                text: p.text ? p.text.slice(0, 100) : null,
                thumbnail: p.media[0]?.thumbnailUrl ?? p.media[0]?.url ?? null,
                views: Number(r.views),
                interactions: Number(r.interactions),
              }
            : null;
        })
        .filter(Boolean),
      daily,
    };
  }

  /** guard for the batch endpoint */
  assertEvents(events: unknown): asserts events is ViewEvent[] {
    if (!Array.isArray(events) || !events.length || events.length > 50) {
      throw new BadRequestException('Send 1 to 50 events');
    }
  }
}
