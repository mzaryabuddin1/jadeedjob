import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import {
  PostComment,
  PostLike,
  PostShare,
} from './entities/post-engagement.entities';
import { PostsService } from './posts.service';
import { PostStatsService } from './post-stats.service';
import { PostEngagementNotifier } from './post-engagement-notifier';
import { FollowService, fullName } from 'src/follow/follow.service';

export const COMMENT_MAX = 1000;
export const SHARE_CHANNELS = ['link', 'chat', 'external'] as const;

/** Likes, comments (+ replies) and shares of a post or reel */
@Injectable()
export class PostEngagementService {
  constructor(
    @InjectRepository(Post) private readonly postRepo: Repository<Post>,
    @InjectRepository(PostLike) private readonly likeRepo: Repository<PostLike>,
    @InjectRepository(PostComment)
    private readonly commentRepo: Repository<PostComment>,
    @InjectRepository(PostShare)
    private readonly shareRepo: Repository<PostShare>,
    private readonly posts: PostsService,
    private readonly stats: PostStatsService,
    private readonly notifier: PostEngagementNotifier,
    private readonly followService: FollowService,
  ) {}

  private async counts(postId: number) {
    return this.postRepo.findOneOrFail({
      where: { id: postId },
      select: ['id', 'likesCount', 'commentsCount', 'sharesCount'],
    });
  }

  // ────────────────────────────────────────────────
  // LIKES
  // ────────────────────────────────────────────────

  /** Idempotent: liking twice (or a double tap) counts once */
  async like(userId: number, postId: number) {
    const post = await this.posts.requirePost(postId, userId);

    const created = await this.likeRepo.manager.transaction(async (m) => {
      const res = await m
        .createQueryBuilder()
        .insert()
        .into(PostLike)
        .values({ postId, userId })
        .orIgnore()
        .updateEntity(false)
        .execute();
      if (!((res.raw?.affectedRows ?? 0) > 0)) return false;
      await m.increment(Post, { id: postId }, 'likesCount', 1);
      return true;
    });

    if (created) {
      await this.stats.bump(postId, { likes: 1 });
      void this.notifier.onLike(post, userId);
    }
    return {
      liked: true,
      created,
      likesCount: (await this.counts(postId)).likesCount,
    };
  }

  async unlike(userId: number, postId: number) {
    await this.posts.requirePost(postId, userId);

    const removed = await this.likeRepo.manager.transaction(async (m) => {
      const res = await m.delete(PostLike, { postId, userId });
      if (!res.affected) return false;
      await m
        .createQueryBuilder()
        .update(Post)
        .set({ likesCount: () => 'GREATEST(likesCount - 1, 0)' })
        .where('id = :postId', { postId })
        .execute();
      return true;
    });
    return {
      liked: false,
      removed,
      likesCount: (await this.counts(postId)).likesCount,
    };
  }

  async listLikes(
    postId: number,
    viewerId: number,
    opts: { before?: number; limit?: number },
  ) {
    await this.posts.requirePost(postId, viewerId);
    const limit = Math.min(50, Math.max(1, Number(opts.limit) || 20));

    const qb = this.likeRepo
      .createQueryBuilder('l')
      .where('l.postId = :postId', { postId })
      .orderBy('l.id', 'DESC')
      .take(limit + 1);
    if (opts.before) qb.andWhere('l.id < :before', { before: opts.before });

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);

    const users = await this.followService.usersById(page.map((r) => r.userId));
    const followed = await this.followService.followedSet(
      viewerId,
      'user',
      page.map((r) => r.userId),
    );
    return {
      total: (await this.counts(postId)).likesCount,
      data: page
        .map((r) => users.get(r.userId))
        .filter(Boolean)
        .map((u) => this.followService.toPerson(u!, viewerId, followed)),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  // ────────────────────────────────────────────────
  // COMMENTS
  // ────────────────────────────────────────────────

  async comment(
    userId: number,
    postId: number,
    text: string,
    parentId?: number,
  ) {
    const post = await this.posts.requirePost(postId, userId);
    const body = text.trim();
    if (!body) throw new BadRequestException('Comment cannot be empty');
    if (body.length > COMMENT_MAX) {
      throw new BadRequestException(
        `Comment can be at most ${COMMENT_MAX} characters`,
      );
    }

    // replies are one level deep: a reply to a reply attaches to the top comment
    let parent: PostComment | null = null;
    if (parentId) {
      parent = await this.commentRepo.findOne({
        where: { id: parentId, postId, deletedAt: IsNull() },
      });
      if (parent?.parentId) {
        parent = await this.commentRepo.findOne({
          where: { id: parent.parentId, postId, deletedAt: IsNull() },
        });
      }
      if (!parent) throw new NotFoundException('Comment not found');
    }

    const saved = await this.commentRepo.manager.transaction(async (m) => {
      const c = await m.save(
        m.create(PostComment, {
          postId,
          userId,
          parentId: parent?.id ?? null,
          text: body,
        }),
      );
      await m.increment(Post, { id: postId }, 'commentsCount', 1);
      if (parent)
        await m.increment(PostComment, { id: parent.id }, 'repliesCount', 1);
      return c;
    });

    await this.stats.bump(postId, { comments: 1 });
    void this.notifier.onComment(post, userId, saved, parent);

    return (await this.commentViews([saved], post, userId))[0];
  }

  async listComments(
    postId: number,
    viewerId: number,
    opts: { before?: number; limit?: number },
  ) {
    const post = await this.posts.requirePost(postId, viewerId);
    const limit = Math.min(50, Math.max(1, Number(opts.limit) || 20));

    const qb = this.visibleComments(postId)
      .andWhere('c.parentId IS NULL')
      .orderBy('c.id', 'DESC')
      .take(limit + 1);
    if (opts.before) qb.andWhere('c.id < :before', { before: opts.before });

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);

    return {
      total: post.commentsCount,
      data: await this.commentViews(page, post, viewerId),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  /** replies of one comment, oldest first so the conversation reads naturally */
  async listReplies(
    commentId: number,
    viewerId: number,
    opts: { after?: number; limit?: number },
  ) {
    const top = await this.commentRepo.findOne({
      where: { id: commentId, deletedAt: IsNull() },
    });
    if (!top) throw new NotFoundException('Comment not found');
    const post = await this.posts.requirePost(top.postId, viewerId);
    const limit = Math.min(50, Math.max(1, Number(opts.limit) || 20));

    const qb = this.visibleComments(top.postId)
      .andWhere('c.parentId = :commentId', { commentId })
      .orderBy('c.id', 'ASC')
      .take(limit + 1);
    if (opts.after) qb.andWhere('c.id > :after', { after: opts.after });

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);

    return {
      data: await this.commentViews(page, post, viewerId),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  /** The comment's author, the post's author or a page manager may delete it */
  async deleteComment(userId: number, commentId: number) {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId, deletedAt: IsNull() },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    const post = await this.posts.requirePost(comment.postId);

    if (
      comment.userId !== userId &&
      !(await this.posts.canManage(post, userId))
    ) {
      throw new ForbiddenException('You cannot delete this comment');
    }

    const removed = await this.commentRepo.manager.transaction(async (m) => {
      // a top comment takes its replies with it
      const res = await m
        .createQueryBuilder()
        .update(PostComment)
        .set({ deletedAt: new Date() })
        .where('deletedAt IS NULL AND (id = :id OR parentId = :id)', {
          id: commentId,
        })
        .execute();
      const n = res.affected ?? 0;

      await m
        .createQueryBuilder()
        .update(Post)
        .set({
          commentsCount: () => `GREATEST(commentsCount - ${Number(n)}, 0)`,
        })
        .where('id = :id', { id: post.id })
        .execute();
      if (comment.parentId) {
        await m
          .createQueryBuilder()
          .update(PostComment)
          .set({ repliesCount: () => 'GREATEST(repliesCount - 1, 0)' })
          .where('id = :id', { id: comment.parentId })
          .execute();
      }
      return n;
    });

    return { message: 'Comment deleted', removed };
  }

  /** comments of a post, hiding the ones by banned users */
  private visibleComments(postId: number) {
    return this.commentRepo
      .createQueryBuilder('c')
      .where('c.postId = :postId AND c.deletedAt IS NULL', { postId })
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM users ub WHERE ub.id = c.userId AND ub.isBanned = 1)',
      );
  }

  private async commentViews(
    rows: PostComment[],
    post: Post,
    viewerId: number,
  ) {
    const users = await this.followService.usersById(rows.map((r) => r.userId));
    const manager = await this.posts.canManage(post, viewerId);
    return rows.map((c) => {
      const u = users.get(c.userId);
      return {
        id: c.id,
        postId: c.postId,
        parentId: c.parentId,
        text: c.text,
        repliesCount: c.repliesCount,
        createdAt: c.createdAt,
        user: u
          ? {
              id: u.id,
              name: fullName(u),
              username: u.username,
              profile_photo: u.profile_photo,
            }
          : null,
        canDelete: c.userId === viewerId || manager,
      };
    });
  }

  // ────────────────────────────────────────────────
  // SHARES
  // ────────────────────────────────────────────────

  shareUrl(postId: number) {
    const template =
      process.env.APP_SHARE_URL ||
      `${process.env.APP_URL || 'http://localhost:3000'}/p/{id}`;
    return template.replace('{id}', String(postId));
  }

  /**
   * The app calls this when the person shares (link copied, sent in chat, or
   * the system share sheet). One person counts once per post however many
   * times or channels they use.
   */
  async share(userId: number, postId: number, channel: string) {
    await this.posts.requirePost(postId, userId);
    const via = (SHARE_CHANNELS as readonly string[]).includes(channel)
      ? channel
      : 'link';

    const created = await this.shareRepo.manager.transaction(async (m) => {
      const res = await m
        .createQueryBuilder()
        .insert()
        .into(PostShare)
        .values({ postId, userId, channel: via })
        .orIgnore()
        .updateEntity(false)
        .execute();
      if (!((res.raw?.affectedRows ?? 0) > 0)) return false;
      await m.increment(Post, { id: postId }, 'sharesCount', 1);
      return true;
    });
    if (created) await this.stats.bump(postId, { shares: 1 });

    return {
      shared: true,
      created,
      sharesCount: (await this.counts(postId)).sharesCount,
      shareUrl: this.shareUrl(postId),
    };
  }

  async shareLink(postId: number, viewerId: number) {
    await this.posts.requirePost(postId, viewerId);
    return { shareUrl: this.shareUrl(postId) };
  }
}
