import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Follow, FollowTargetType } from './follow.entity';
import { User } from 'src/users/entities/user.entity';
import { Page } from 'src/pages/entities/page.entity';
import { FollowNotifier } from './follow-notifier';

export type PersonCard = {
  id: number;
  name: string;
  username: string | null;
  profile_photo: string | null;
  headline: string | null;
  isFollowing: boolean;
  isMe: boolean;
};

export type PageCard = {
  id: number;
  page_name: string;
  username: string;
  page_logo: string | null;
  is_verified: boolean;
  followersCount: number;
  isFollowing: boolean;
};

export const fullName = (u?: Partial<User> | null) =>
  `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim();

/**
 * Follow graph for users AND pages ("followers" and "following").
 * - follow / unfollow are idempotent (calling twice is fine)
 * - counters on users.followersCount / followingCount / pages.followersCount
 *   are updated in the same transaction as the follow row, so they never drift
 */
@Injectable()
export class FollowService {
  constructor(
    @InjectRepository(Follow) private readonly followRepo: Repository<Follow>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Page) private readonly pageRepo: Repository<Page>,
    private readonly notifier: FollowNotifier,
  ) {}

  // ────────────────────────────────────────────────
  // FOLLOW / UNFOLLOW
  // ────────────────────────────────────────────────

  /** @returns whether a NEW follow was created (false = was already following) */
  async follow(followerId: number, type: FollowTargetType, targetId: number) {
    await this.assertTarget(type, targetId, followerId);

    const created = await this.followRepo.manager.transaction(async (m) => {
      const res = await m
        .createQueryBuilder()
        .insert()
        .into(Follow)
        .values({ followerId, targetType: type, targetId })
        .orIgnore() // INSERT IGNORE: a duplicate (or double tap) inserts nothing
        .updateEntity(false) // nothing to read back (no id when ignored)
        .execute();

      if (!((res.raw?.affectedRows ?? 0) > 0)) return false;

      await m.increment(User, { id: followerId }, 'followingCount', 1);
      await m.increment(
        type === 'user' ? User : Page,
        { id: targetId },
        'followersCount',
        1,
      );
      return true;
    });

    if (created) void this.notifier.onFollow(followerId, type, targetId);

    return {
      created,
      following: true,
      followersCount: await this.followersCount(type, targetId),
    };
  }

  async unfollow(followerId: number, type: FollowTargetType, targetId: number) {
    const removed = await this.followRepo.manager.transaction(async (m) => {
      const res = await m.delete(Follow, {
        followerId,
        targetType: type,
        targetId,
      });
      if (!res.affected) return false;

      // never below zero, even if a counter was off
      await m
        .createQueryBuilder()
        .update(User)
        .set({ followingCount: () => 'GREATEST(followingCount - 1, 0)' })
        .where('id = :id', { id: followerId })
        .execute();
      await m
        .createQueryBuilder()
        .update(type === 'user' ? User : Page)
        .set({ followersCount: () => 'GREATEST(followersCount - 1, 0)' })
        .where('id = :id', { id: targetId })
        .execute();
      return true;
    });

    return {
      removed,
      following: false,
      followersCount: await this.followersCount(type, targetId),
    };
  }

  private async assertTarget(
    type: FollowTargetType,
    targetId: number,
    followerId: number,
  ) {
    if (type === 'user') {
      if (targetId === followerId) {
        throw new BadRequestException('You cannot follow yourself');
      }
      const user = await this.userRepo.findOne({
        where: { id: targetId },
        select: ['id', 'isBanned'],
      });
      if (!user || user.isBanned) throw new NotFoundException('User not found');
    } else if (!(await this.pageRepo.exist({ where: { id: targetId } }))) {
      throw new NotFoundException('Page not found');
    }
  }

  async followersCount(type: FollowTargetType, targetId: number) {
    const row =
      type === 'user'
        ? await this.userRepo.findOne({
            where: { id: targetId },
            select: ['id', 'followersCount'],
          })
        : await this.pageRepo.findOne({
            where: { id: targetId },
            select: ['id', 'followersCount'],
          });
    return row?.followersCount ?? 0;
  }

  // ────────────────────────────────────────────────
  // BULK "do I follow these?" (used by every list that shows a Follow button)
  // ────────────────────────────────────────────────

  async followedSet(
    viewerId: number,
    type: FollowTargetType,
    ids: number[],
  ): Promise<Set<number>> {
    const unique = [...new Set(ids)];
    if (!viewerId || !unique.length) return new Set();
    const rows = await this.followRepo.find({
      where: { followerId: viewerId, targetType: type, targetId: In(unique) },
      select: ['targetId'],
    });
    return new Set(rows.map((r) => r.targetId));
  }

  async isFollowing(viewerId: number, type: FollowTargetType, id: number) {
    return (await this.followedSet(viewerId, type, [id])).has(id);
  }

  // ────────────────────────────────────────────────
  // LISTS
  // ────────────────────────────────────────────────

  /** People who follow a user or a page, newest first (cursor = follow id) */
  async listFollowers(
    type: FollowTargetType,
    targetId: number,
    viewerId: number,
    opts: { before?: number; limit?: number } = {},
  ) {
    const exists =
      type === 'user'
        ? await this.userRepo.exist({ where: { id: targetId } })
        : await this.pageRepo.exist({ where: { id: targetId } });
    if (!exists) throw new NotFoundException('Not found');

    const limit = this.clampLimit(opts.limit);
    const qb = this.followRepo
      .createQueryBuilder('f')
      .where('f.targetType = :type AND f.targetId = :targetId', {
        type,
        targetId,
      })
      .orderBy('f.id', 'DESC')
      .take(limit + 1);
    if (opts.before) qb.andWhere('f.id < :before', { before: opts.before });

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);

    const users = await this.usersById(page.map((r) => r.followerId));
    const followed = await this.followedSet(
      viewerId,
      'user',
      page.map((r) => r.followerId),
    );

    return {
      total: await this.followersCount(type, targetId),
      data: page
        .map((r) => users.get(r.followerId))
        .filter(Boolean)
        .map((u) => this.toPerson(u!, viewerId, followed)),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  /** What a user follows: people, pages or both (`kind`), newest first */
  async listFollowing(
    userId: number,
    kind: 'users' | 'pages' | 'all',
    viewerId: number,
    opts: { before?: number; limit?: number } = {},
  ) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'isBanned', 'followingCount'],
    });
    if (!user || user.isBanned) throw new NotFoundException('User not found');

    const limit = this.clampLimit(opts.limit);
    const qb = this.followRepo
      .createQueryBuilder('f')
      .where('f.followerId = :userId', { userId })
      .orderBy('f.id', 'DESC')
      .take(limit + 1);
    if (kind !== 'all') {
      qb.andWhere('f.targetType = :t', {
        t: kind === 'users' ? 'user' : 'page',
      });
    }
    if (opts.before) qb.andWhere('f.id < :before', { before: opts.before });

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const slice = rows.slice(0, limit);

    const userIds = slice
      .filter((r) => r.targetType === 'user')
      .map((r) => r.targetId);
    const pageIds = slice
      .filter((r) => r.targetType === 'page')
      .map((r) => r.targetId);
    const users = await this.usersById(userIds);
    const pages = await this.pagesById(pageIds);
    const followedUsers = await this.followedSet(viewerId, 'user', userIds);
    const followedPages = await this.followedSet(viewerId, 'page', pageIds);

    const data = slice
      .map((r) => {
        if (r.targetType === 'user') {
          const u = users.get(r.targetId);
          return u
            ? {
                type: 'user' as const,
                ...this.toPerson(u, viewerId, followedUsers),
              }
            : null;
        }
        const p = pages.get(r.targetId);
        return p
          ? { type: 'page' as const, ...this.toPageCard(p, followedPages) }
          : null;
      })
      .filter(Boolean);

    return {
      total: user.followingCount,
      data,
      nextCursor: hasMore ? slice[slice.length - 1].id : null,
    };
  }

  // ────────────────────────────────────────────────
  // helpers
  // ────────────────────────────────────────────────

  private clampLimit(limit?: number) {
    return Math.min(50, Math.max(1, Number(limit) || 20));
  }

  async usersById(ids: number[]) {
    const unique = [...new Set(ids)];
    const users = unique.length
      ? await this.userRepo.find({
          where: { id: In(unique), isBanned: false },
          select: [
            'id',
            'firstName',
            'lastName',
            'username',
            'profile_photo',
            'headline',
          ],
        })
      : [];
    return new Map(users.map((u) => [u.id, u]));
  }

  async pagesById(ids: number[]) {
    const unique = [...new Set(ids)];
    const pages = unique.length
      ? await this.pageRepo.find({
          where: { id: In(unique) },
          select: [
            'id',
            'page_name',
            'username',
            'page_logo',
            'is_verified',
            'followersCount',
          ],
        })
      : [];
    return new Map(pages.map((p) => [p.id, p]));
  }

  toPerson(u: User, viewerId: number, followed: Set<number>): PersonCard {
    return {
      id: u.id,
      name: fullName(u),
      username: u.username,
      profile_photo: u.profile_photo,
      headline: u.headline,
      isFollowing: followed.has(u.id),
      isMe: u.id === viewerId,
    };
  }

  toPageCard(p: Page, followed: Set<number>): PageCard {
    return {
      id: p.id,
      page_name: p.page_name,
      username: p.username,
      page_logo: p.page_logo,
      is_verified: !!p.is_verified,
      followersCount: p.followersCount,
      isFollowing: followed.has(p.id),
    };
  }
}
