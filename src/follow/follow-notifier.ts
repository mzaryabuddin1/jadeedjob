import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Follow, FollowTargetType } from './follow.entity';
import { User } from 'src/users/entities/user.entity';
import { Page } from 'src/pages/entities/page.entity';
import { NotificationQueueService } from 'src/notification/notification-queue.service';
import { NotificationQueueItem } from 'src/notification/notification-queue.entity';
import { NotificationService } from 'src/notification/notification.service';

const num = (v: string | undefined, fallback: number) =>
  v !== undefined && v !== '' && !Number.isNaN(Number(v))
    ? Number(v)
    : fallback;

/**
 * "Ali started following you" - merged per target, never one push per follower:
 * "Ali and 4 others started following you". A follow that was undone before
 * the batch is sent does not count. A page's followers notify its owner.
 *
 * Env: FOLLOW_NOTIFY_DELAY_SECONDS (60), FOLLOW_NOTIFY_MIN_GAP_SECONDS (120),
 *      NOTIFICATION_PROFILE_PATH (`/user/{id}`), NOTIFICATION_PAGE_PATH (`/page/{id}`)
 */
@Injectable()
export class FollowNotifier implements OnModuleInit {
  private readonly logger = new Logger(FollowNotifier.name);

  constructor(
    private readonly queue: NotificationQueueService,
    private readonly notifications: NotificationService,
    @InjectRepository(Follow) private readonly followRepo: Repository<Follow>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Page) private readonly pageRepo: Repository<Page>,
  ) {}

  onModuleInit() {
    this.queue.register('follow', {
      delaySeconds: num(process.env.FOLLOW_NOTIFY_DELAY_SECONDS, 60),
      minGapSeconds: num(process.env.FOLLOW_NOTIFY_MIN_GAP_SECONDS, 120),
      handler: (items) => this.flush(items),
    });
  }

  /** Called after a NEW follow. Never throws. */
  async onFollow(actorId: number, type: FollowTargetType, targetId: number) {
    try {
      let recipientId = targetId;
      if (type === 'page') {
        const page = await this.pageRepo.findOne({
          where: { id: targetId },
          select: ['id', 'ownerId'],
        });
        if (!page) return;
        recipientId = page.ownerId;
      }
      if (recipientId === actorId) return;

      await this.queue.enqueue({
        type: 'follow',
        groupKey: `follow:${type}:${targetId}`,
        recipientId,
        payload: { actorId, targetType: type, targetId },
      });
    } catch (err) {
      this.logger.error(
        `Could not queue follow notification: ${(err as Error)?.message}`,
      );
    }
  }

  private async flush(items: NotificationQueueItem[]) {
    const { targetType, targetId } = items[0].payload as {
      targetType: FollowTargetType;
      targetId: number;
    };

    // only people who still follow
    const actorIds = [
      ...new Set(items.map((i) => i.payload!.actorId as number)),
    ];
    const still = await this.followRepo.find({
      where: { targetType, targetId, followerId: In(actorIds) },
      order: { id: 'DESC' },
    });
    if (!still.length)
      return { status: 'skipped' as const, note: 'all follows were undone' };

    const users = await this.userRepo.find({
      where: { id: In(still.map((f) => f.followerId)) },
      select: ['id', 'firstName', 'lastName'],
    });
    const name = (id: number) => {
      const u = users.find((x) => x.id === id);
      return `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim() || 'Someone';
    };

    let subject = 'you';
    let path = (process.env.NOTIFICATION_PROFILE_PATH || '/user/{id}').replace(
      '{id}',
      String(targetId),
    );
    if (targetType === 'page') {
      const page = await this.pageRepo.findOne({
        where: { id: targetId },
        select: ['id', 'page_name'],
      });
      subject = `"${page?.page_name ?? 'your page'}"`;
      path = (process.env.NOTIFICATION_PAGE_PATH || '/page/{id}').replace(
        '{id}',
        String(targetId),
      );
    }

    const others = still.length - 1;
    const body =
      others === 0
        ? `${name(still[0].followerId)} started following ${subject}`
        : `${name(still[0].followerId)} and ${others} other${others > 1 ? 's' : ''} started following ${subject}`;

    const res = await this.notifications.notifyUser(items[0].recipientId, {
      title: 'New followers',
      body,
      data: {
        type: 'new_follower',
        targetType,
        targetId,
        count: still.length,
        path,
      },
    });
    return {
      status: 'sent' as const,
      note: `"${body}" | push ${res.push}${res.email ? ' + email' : ''}`,
    };
  }
}
