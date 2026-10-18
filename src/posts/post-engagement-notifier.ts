import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { PostComment, PostLike } from './entities/post-engagement.entities';
import { User } from 'src/users/entities/user.entity';
import { NotificationQueueService } from 'src/notification/notification-queue.service';
import { NotificationQueueItem } from 'src/notification/notification-queue.entity';
import { NotificationService } from 'src/notification/notification.service';
import { fullName } from 'src/follow/follow.service';

const num = (v: string | undefined, fallback: number) =>
  v !== undefined && v !== '' && !Number.isNaN(Number(v))
    ? Number(v)
    : fallback;

/**
 * Tells post authors about likes and comments - never one push per like.
 * Events go into the notification queue and are merged per post:
 *   "Ali and 4 others liked your reel", "3 new comments on your post".
 * Likes are re-checked when the batch is sent, so a like that was taken
 * back does not count. People never get notified about their own actions.
 *
 * Env: POST_LIKE_NOTIFY_DELAY_SECONDS (45) / _MIN_GAP_SECONDS (180),
 *      POST_COMMENT_NOTIFY_DELAY_SECONDS (20) / _MIN_GAP_SECONDS (60),
 *      NOTIFICATION_POST_PATH (deep link, `{id}` = post id, default `/post/{id}`)
 */
@Injectable()
export class PostEngagementNotifier implements OnModuleInit {
  private readonly logger = new Logger(PostEngagementNotifier.name);

  constructor(
    private readonly queue: NotificationQueueService,
    private readonly notifications: NotificationService,
    @InjectRepository(Post) private readonly postRepo: Repository<Post>,
    @InjectRepository(PostLike) private readonly likeRepo: Repository<PostLike>,
    @InjectRepository(PostComment)
    private readonly commentRepo: Repository<PostComment>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  onModuleInit() {
    this.queue.register('post_like', {
      delaySeconds: num(process.env.POST_LIKE_NOTIFY_DELAY_SECONDS, 45),
      minGapSeconds: num(process.env.POST_LIKE_NOTIFY_MIN_GAP_SECONDS, 180),
      handler: (items) => this.flushLikes(items),
    });
    this.queue.register('post_comment', {
      delaySeconds: num(process.env.POST_COMMENT_NOTIFY_DELAY_SECONDS, 20),
      minGapSeconds: num(process.env.POST_COMMENT_NOTIFY_MIN_GAP_SECONDS, 60),
      handler: (items) => this.flushComments(items),
    });
  }

  private path(postId: number) {
    return (process.env.NOTIFICATION_POST_PATH || '/post/{id}').replace(
      '{id}',
      String(postId),
    );
  }

  // ── events (called by PostEngagementService, never throw) ──

  async onLike(post: Post, actorId: number) {
    if (actorId === post.authorId) return;
    await this.safeEnqueue({
      type: 'post_like',
      groupKey: `post_like:${post.id}`,
      recipientId: post.authorId,
      payload: { postId: post.id, actorId },
    });
  }

  /** Post author hears about comments; the author of a comment hears about replies */
  async onComment(
    post: Post,
    actorId: number,
    comment: PostComment,
    parent: PostComment | null,
  ) {
    if (actorId !== post.authorId) {
      await this.safeEnqueue({
        type: 'post_comment',
        groupKey: `post_comment:${post.id}`,
        recipientId: post.authorId,
        payload: { postId: post.id, actorId, commentId: comment.id },
      });
    }
    if (
      parent &&
      parent.userId !== actorId &&
      parent.userId !== post.authorId
    ) {
      await this.safeEnqueue({
        type: 'post_comment',
        groupKey: `comment_reply:${parent.id}`,
        recipientId: parent.userId,
        payload: {
          postId: post.id,
          actorId,
          commentId: comment.id,
          reply: true,
        },
      });
    }
  }

  private async safeEnqueue(
    item: Parameters<NotificationQueueService['enqueue']>[0],
  ) {
    try {
      await this.queue.enqueue(item);
    } catch (err) {
      this.logger.error(
        `Could not queue ${item.type}: ${(err as Error)?.message}`,
      );
    }
  }

  // ── batch senders ──

  private async names(ids: number[]) {
    const users = ids.length
      ? await this.userRepo.find({
          where: { id: In([...new Set(ids)]) },
          select: ['id', 'firstName', 'lastName'],
        })
      : [];
    return new Map(users.map((u) => [u.id, fullName(u) || 'Someone']));
  }

  /** "Ali liked your reel" / "Ali and 4 others liked your reel" */
  private async flushLikes(items: NotificationQueueItem[]) {
    const postId = items[0].payload!.postId as number;
    const post = await this.postRepo.findOne({
      where: { id: postId, deletedAt: IsNull() },
    });
    if (!post) return { status: 'skipped' as const, note: 'post deleted' };

    // only likes that still exist (unlike -> like churn must not inflate the count)
    const actorIds = [
      ...new Set(items.map((i) => i.payload!.actorId as number)),
    ];
    const still = await this.likeRepo.find({
      where: { postId, userId: In(actorIds) },
      order: { id: 'DESC' },
    });
    if (!still.length)
      return { status: 'skipped' as const, note: 'all likes were taken back' };

    const names = await this.names(still.map((l) => l.userId));
    const first = names.get(still[0].userId)!;
    const others = still.length - 1;
    const noun = post.kind === 'reel' ? 'reel' : 'post';
    const body =
      others === 0
        ? `${first} liked your ${noun}`
        : `${first} and ${others} other${others > 1 ? 's' : ''} liked your ${noun}`;

    const res = await this.notifications.notifyUser(post.authorId, {
      title: 'New likes',
      body,
      data: {
        type: 'post_like',
        postId,
        kind: post.kind,
        count: still.length,
        totalLikes: post.likesCount,
        path: this.path(postId),
      },
    });
    return {
      status: 'sent' as const,
      note: `"${body}" | push ${res.push}${res.email ? ' + email' : ''}`,
    };
  }

  /** "Ali commented: ..." / "3 new comments on your reel" (or replies to a comment) */
  private async flushComments(items: NotificationQueueItem[]) {
    const postId = items[0].payload!.postId as number;
    const reply = !!items[0].payload!.reply;
    const post = await this.postRepo.findOne({
      where: { id: postId, deletedAt: IsNull() },
    });
    if (!post) return { status: 'skipped' as const, note: 'post deleted' };

    const ids = items.map((i) => i.payload!.commentId as number);
    const live = await this.commentRepo.find({
      where: { id: In(ids), deletedAt: IsNull() },
      order: { id: 'DESC' },
    });
    if (!live.length)
      return { status: 'skipped' as const, note: 'comments were deleted' };

    const names = await this.names(live.map((c) => c.userId));
    const noun = post.kind === 'reel' ? 'reel' : 'post';
    let body: string;
    if (live.length === 1) {
      const snippet =
        live[0].text.length > 80
          ? `${live[0].text.slice(0, 77)}...`
          : live[0].text;
      body = reply
        ? `${names.get(live[0].userId)} replied: "${snippet}"`
        : `${names.get(live[0].userId)} commented: "${snippet}"`;
    } else {
      body = reply
        ? `${live.length} new replies to your comment`
        : `${live.length} new comments on your ${noun}`;
    }

    const res = await this.notifications.notifyUser(items[0].recipientId, {
      title: reply ? 'New replies' : 'New comments',
      body,
      data: {
        type: reply ? 'comment_reply' : 'post_comment',
        postId,
        kind: post.kind,
        count: live.length,
        commentId: live[0].id,
        path: this.path(postId),
      },
    });
    return {
      status: 'sent' as const,
      note: `"${body}" | push ${res.push}${res.email ? ' + email' : ''}`,
    };
  }
}
