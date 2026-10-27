import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Not, Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { ChatEvents } from 'src/chat/chat-events.service';

export type InboxMessage = {
  type?: string;
  title: string;
  body: string;
  data?: Record<string, string | number | boolean | null | undefined>;
};

/** the push payload repeats these, the list already has them as columns */
const DUPLICATED_KEYS = new Set(['title', 'text', 'createdAt', 'type']);

const KEEP_DAYS = Math.max(1, Number(process.env.NOTIFICATION_KEEP_DAYS) || 90);
const BULK_CHUNK = 500;

/**
 * The in-app notification list: what the bell screen shows. Everything that
 * is pushed to a person is also stored here (`NotificationService.notifyUser`,
 * new-job alerts, application alerts), so the list is complete even when push
 * is off or a push was missed.
 *
 * Live: `notification:new` on the socket namespace `chat` (room `user:{id}`).
 * Old rows are deleted after NOTIFICATION_KEEP_DAYS (90).
 */
@Injectable()
export class NotificationInbox implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationInbox.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    private readonly events: ChatEvents,
  ) {}

  onModuleInit() {
    if (process.env.NOTIFICATION_WORKER === 'off') return;
    this.timer = setInterval(() => void this.purge(), 6 * 60 * 60 * 1000);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async purge() {
    try {
      const before = new Date(Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000);
      await this.repo.delete({ createdAt: LessThan(before) });
    } catch (err) {
      this.logger.error(`Purge failed: ${(err as Error)?.message}`);
    }
  }

  // ────────────────────────────────────────────────
  // WRITE (called by the senders). Never throws.
  // ────────────────────────────────────────────────

  async add(userId: number, message: InboxMessage) {
    try {
      const row = await this.repo.save(
        this.repo.create({ userId, ...this.values(message) }),
      );
      this.events.emitToUsers([userId], 'notification:new', {
        notification: this.view(row),
      });
      return row;
    } catch (err) {
      this.logger.error(
        `Could not store notification for #${userId}: ${(err as Error)?.message}`,
      );
    }
  }

  /** the same notification for many people (a new job): one insert per chunk */
  async addMany(userIds: number[], message: InboxMessage) {
    const ids = [...new Set(userIds)];
    if (!ids.length) return;
    try {
      const values = this.values(message);
      for (let i = 0; i < ids.length; i += BULK_CHUNK) {
        const chunk = ids.slice(i, i + BULK_CHUNK);
        await this.repo.insert(chunk.map((userId) => ({ userId, ...values })));
        // no single id to send: the app just refreshes its badge / list
        this.events.emitToUsers(chunk, 'notification:new', { notification: null });
      }
    } catch (err) {
      this.logger.error(
        `Could not store ${ids.length} notifications: ${(err as Error)?.message}`,
      );
    }
  }

  private values(m: InboxMessage) {
    const data: Record<string, string> = {};
    for (const [k, v] of Object.entries(m.data ?? {})) {
      if (DUPLICATED_KEYS.has(k) || v == null || v === '') continue;
      data[k] = String(v);
    }
    return {
      type: String(m.type ?? m.data?.type ?? 'general').slice(0, 40),
      title: m.title.slice(0, 255),
      body: m.body,
      data: Object.keys(data).length ? data : null,
    };
  }

  // ────────────────────────────────────────────────
  // READ (the API)
  // ────────────────────────────────────────────────

  /** newest first, cursor = notification id */
  async list(
    userId: number,
    opts: { before?: number; limit?: number; unreadOnly?: boolean; type?: string },
  ) {
    const limit = Math.min(50, Math.max(1, Number(opts.limit) || 20));
    const qb = this.repo
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId })
      .orderBy('n.id', 'DESC')
      .take(limit + 1);
    if (opts.before) qb.andWhere('n.id < :before', { before: opts.before });
    if (opts.unreadOnly) qb.andWhere('n.readAt IS NULL');
    if (opts.type) qb.andWhere('n.type = :type', { type: opts.type });

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    return {
      data: page.map((r) => this.view(r)),
      nextCursor: hasMore ? page[page.length - 1].id : null,
      hasMore,
      unreadCount: await this.unreadCount(userId),
    };
  }

  unreadCount(userId: number) {
    return this.repo.count({ where: { userId, readAt: IsNull() } });
  }

  async markRead(userId: number, id: number) {
    const row = await this.own(userId, id);
    if (!row.readAt) {
      row.readAt = new Date();
      await this.repo.update(row.id, { readAt: row.readAt });
      this.events.emitToUsers([userId], 'notification:read', { ids: [id] });
    }
    return { ...this.view(row), unreadCount: await this.unreadCount(userId) };
  }

  async markAllRead(userId: number, type?: string) {
    const qb = this.repo
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: new Date() })
      .where('userId = :userId AND readAt IS NULL', { userId });
    if (type) qb.andWhere('type = :type', { type });
    const res = await qb.execute();
    this.events.emitToUsers([userId], 'notification:read', { all: true, type: type ?? null });
    return { updated: res.affected ?? 0, unreadCount: await this.unreadCount(userId) };
  }

  async remove(userId: number, id: number) {
    await this.own(userId, id);
    await this.repo.delete(id);
    return { message: 'Notification deleted', unreadCount: await this.unreadCount(userId) };
  }

  /** delete the whole list, or only the ones already read */
  async clear(userId: number, onlyRead: boolean) {
    const res = await this.repo.delete(
      onlyRead ? { userId, readAt: Not(IsNull()) } : { userId },
    );
    return { deleted: res.affected ?? 0, unreadCount: await this.unreadCount(userId) };
  }

  private async own(userId: number, id: number) {
    const row = await this.repo.findOne({ where: { id, userId } });
    if (!row) throw new NotFoundException('Notification not found');
    return row;
  }

  view(n: Notification) {
    return {
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      /** deep link the app opens on tap (same as the push `path`) */
      path: n.data?.path ?? null,
      data: n.data ?? {},
      read: !!n.readAt,
      readAt: n.readAt,
      createdAt: n.createdAt,
    };
  }
}
