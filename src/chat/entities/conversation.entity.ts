import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * - direct: two people, no context (a DM to any user)
 * - job:    one applicant <-> the employer side of ONE job. The employer side
 *           is whoever is on the job's team right now (the poster of a personal
 *           job; owner + admins/editors of a page job), not a fixed person.
 */
export type ConversationType = 'direct' | 'job';

/**
 * One chat thread. `key` is unique per thread so opening the "same" chat twice
 * (double tap, two devices, a race) always lands on one row:
 *   direct `d:{lowUserId}:{highUserId}` | job `j:{jobId}:{applicantId}`
 */
@Entity('conversations')
@Index('IDX_conv_last', ['lastMessageAt'])
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 12 })
  type: ConversationType;

  @Column({ type: 'varchar', length: 60, unique: true })
  key: string;

  @Column({ type: 'int', nullable: true })
  jobId: number | null;

  /** DM: who started it. Job chat: the applicant (the person the chat is with) */
  @Column()
  createdBy: number;

  /** denormalised for the inbox (sorted by it, hidden while null = no message yet) */
  @Column({ type: 'int', nullable: true })
  lastMessageId: number | null;

  @Column({ type: 'datetime', nullable: true })
  lastMessageAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
