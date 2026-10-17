import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { LessThan, Repository } from 'typeorm';
import { NotificationQueueItem } from './notification-queue.entity';

/** 'sent' = a notification went out, 'skipped' = nothing to send (job gone, user opted out...) */
export type QueueHandlerResult =
  | 'sent'
  | 'skipped'
  | { status: 'sent' | 'skipped'; note?: string };

export type QueueRegistration = {
  /** Wait this long after the FIRST queued item of a group before sending */
  delaySeconds: number;
  /** After a notification for a group was sent, wait at least this long before the next one */
  minGapSeconds: number;
  /** Receives every item of the group and sends ONE merged notification */
  handler: (items: NotificationQueueItem[]) => Promise<QueueHandlerResult>;
};

const MAX_ATTEMPTS = 3;
const CLAIM_TIMEOUT_MS = 5 * 60 * 1000;
const KEEP_PROCESSED_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Batches notification events so people are not spammed:
 *
 *   event -> enqueue() -> (wait `delaySeconds`) -> ONE merged notification
 *
 * - Durable: items are rows in `notification_queue` (survive restarts).
 * - Multi-instance safe: a group is claimed with an atomic UPDATE.
 * - Retries: handler errors retry up to 3 times with backoff.
 * - Smart spacing: `minGapSeconds` stops a busy group from pinging nonstop.
 *
 * Env: NOTIFICATION_WORKER=off disables the worker on an instance,
 *      NOTIFICATION_QUEUE_POLL_SECONDS (default 5) sets the polling interval.
 */
@Injectable()
export class NotificationQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationQueueService.name);
  private readonly registrations = new Map<string, QueueRegistration>();
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private lastCleanup = 0;

  constructor(
    @InjectRepository(NotificationQueueItem)
    private readonly repo: Repository<NotificationQueueItem>,
  ) {}

  register(type: string, registration: QueueRegistration) {
    this.registrations.set(type, registration);
  }

  async enqueue(item: {
    type: string;
    groupKey: string;
    recipientId: number;
    payload?: Record<string, any>;
  }) {
    await this.repo.insert({
      type: item.type,
      groupKey: item.groupKey,
      recipientId: item.recipientId,
      payload: item.payload ?? null,
      status: 'pending',
      queuedAt: new Date(),
    });
  }

  onModuleInit() {
    if (process.env.NOTIFICATION_WORKER === 'off') {
      this.logger.warn('Notification worker is OFF on this instance');
      return;
    }
    const pollMs =
      Math.max(1, Number(process.env.NOTIFICATION_QUEUE_POLL_SECONDS) || 5) *
      1000;
    this.timer = setInterval(() => void this.tick(), pollMs);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** One worker pass (public so tests/diagnostics can call it) */
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.releaseStuckClaims();
      for (const [type, reg] of this.registrations) {
        await this.processType(type, reg);
      }
      await this.cleanupOld();
    } catch (err) {
      this.logger.error(
        `Queue tick failed: ${(err as Error)?.message}`,
        (err as Error)?.stack,
      );
    } finally {
      this.running = false;
    }
  }

  private async processType(type: string, reg: QueueRegistration) {
    const now = new Date();
    const cutoff = new Date(now.getTime() - reg.delaySeconds * 1000);

    const groups: { groupKey: string }[] = await this.repo
      .createQueryBuilder('q')
      .select('q.groupKey', 'groupKey')
      .where('q.type = :type AND q.status = :status', {
        type,
        status: 'pending',
      })
      .andWhere('(q.notBefore IS NULL OR q.notBefore <= :now)', { now })
      .groupBy('q.groupKey')
      .having('MIN(q.queuedAt) <= :cutoff', { cutoff })
      .limit(50)
      .getRawMany();

    for (const { groupKey } of groups) {
      if (await this.withinGap(groupKey, reg.minGapSeconds, now)) continue;
      await this.processGroup(type, groupKey, reg);
    }
  }

  /** Was a notification for this group already sent too recently? */
  private async withinGap(groupKey: string, gapSeconds: number, now: Date) {
    if (gapSeconds <= 0) return false;
    const row = await this.repo
      .createQueryBuilder('q')
      .select('MAX(q.processedAt)', 'last')
      .where('q.groupKey = :groupKey AND q.status = :status', {
        groupKey,
        status: 'sent',
      })
      .getRawOne();
    if (!row?.last) return false;
    return now.getTime() - new Date(row.last).getTime() < gapSeconds * 1000;
  }

  private async processGroup(
    type: string,
    groupKey: string,
    reg: QueueRegistration,
  ) {
    const now = new Date();
    const token = randomUUID();

    // Atomic claim: only rows that already exist now. Items queued later
    // stay pending and form the next batch.
    const claim = await this.repo
      .createQueryBuilder()
      .update(NotificationQueueItem)
      .set({ status: 'claimed', claimToken: token, claimedAt: now })
      .where('type = :type AND groupKey = :groupKey AND status = :pending', {
        type,
        groupKey,
        pending: 'pending',
      })
      .andWhere('queuedAt <= :now', { now })
      .andWhere('(notBefore IS NULL OR notBefore <= :now)', { now })
      .execute();

    if (!claim.affected) return; // another instance took it

    const items = await this.repo.find({
      where: { claimToken: token },
      order: { id: 'ASC' },
    });

    try {
      const raw = await reg.handler(items);
      const result = typeof raw === 'string' ? { status: raw } : raw;
      await this.repo.update(
        { claimToken: token },
        {
          status: result.status,
          note: (result.note ?? '').slice(0, 250) || null,
          processedAt: new Date(),
        },
      );
      this.logger.log(
        `${groupKey}: ${items.length} item(s) -> ${result.status.toUpperCase()}${result.note ? ` (${result.note})` : ''}`,
      );
    } catch (err) {
      const message = String((err as Error)?.message ?? err).slice(0, 250);
      this.logger.error(`${groupKey}: handler failed - ${message}`);

      for (const item of items) {
        const attempts = item.attempts + 1;
        if (attempts >= MAX_ATTEMPTS) {
          await this.repo.update(item.id, {
            status: 'failed',
            attempts,
            lastError: message,
            processedAt: new Date(),
          });
        } else {
          await this.repo.update(item.id, {
            status: 'pending',
            claimToken: null,
            claimedAt: null,
            attempts,
            lastError: message,
            notBefore: new Date(Date.now() + attempts * 30 * 1000),
          });
        }
      }
    }
  }

  /** A crashed instance must not hold items forever */
  private async releaseStuckClaims() {
    await this.repo.update(
      {
        status: 'claimed',
        claimedAt: LessThan(new Date(Date.now() - CLAIM_TIMEOUT_MS)),
      },
      { status: 'pending', claimToken: null, claimedAt: null },
    );
  }

  private async cleanupOld() {
    if (Date.now() - this.lastCleanup < 60 * 60 * 1000) return;
    this.lastCleanup = Date.now();
    await this.repo.delete({
      processedAt: LessThan(new Date(Date.now() - KEEP_PROCESSED_MS)),
    });
  }
}
