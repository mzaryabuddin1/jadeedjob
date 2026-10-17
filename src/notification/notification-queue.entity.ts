import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type QueueItemStatus =
  | 'pending'
  | 'claimed'
  | 'sent'
  | 'skipped'
  | 'failed';

/**
 * Durable queue of notification "events" waiting to be batched and sent.
 * One row per event (e.g. one row per job application); the worker groups
 * pending rows by `groupKey` and sends ONE notification per group.
 * Lives in MySQL so queued items survive restarts and several app
 * instances can share it safely (rows are claimed atomically).
 */
@Entity('notification_queue')
@Index('IDX_notification_queue_pending', ['type', 'status', 'groupKey'])
@Index('IDX_notification_queue_group', ['groupKey', 'status', 'processedAt'])
export class NotificationQueueItem {
  @PrimaryGeneratedColumn()
  id: number;

  /** e.g. `job_application` - selects the handler that builds the notification */
  @Column({ type: 'varchar', length: 40 })
  type: string;

  /** Rows with the same key are merged into one notification, e.g. `job_application:12` */
  @Column({ type: 'varchar', length: 120 })
  groupKey: string;

  /** Who receives the notification */
  @Column({ type: 'int' })
  recipientId: number;

  @Column({ type: 'json', nullable: true })
  payload: Record<string, any> | null;

  @Column({ type: 'varchar', length: 10, default: 'pending' })
  status: QueueItemStatus;

  @Column({ type: 'datetime', precision: 3 })
  queuedAt: Date;

  /** Retry backoff: do not process before this time */
  @Column({ type: 'datetime', precision: 3, nullable: true })
  notBefore: Date | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  claimToken: string | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  claimedAt: Date | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  processedAt: Date | null;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  lastError: string | null;
}
