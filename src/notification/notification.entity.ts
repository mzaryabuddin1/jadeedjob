import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * One row of a person's in-app notification list (the bell screen). Written
 * every time something is pushed to them, even when their push / email is
 * turned off, so nothing is lost if a push is missed.
 */
@Entity('notifications')
@Index('IDX_notification_user', ['userId', 'id'])
@Index('IDX_notification_user_unread', ['userId', 'readAt'])
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  /** job_created, job_application, application_accepted, new_follower, post_like, ... */
  @Column({ type: 'varchar', length: 40 })
  type: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  /** what the app needs to open it: `path` (deep link), ids, names... (strings) */
  @Column({ type: 'json', nullable: true })
  data: Record<string, string> | null;

  @Column({ type: 'datetime', nullable: true })
  readAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
