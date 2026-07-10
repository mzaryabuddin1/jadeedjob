import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';

export type ReelCategory = 'community' | 'jobs' | 'social';
export type ReelVisibility = 'public' | 'followers' | 'draft';
export type ReelStatus =
  | 'upload_pending'
  | 'processing'
  | 'published'
  | 'draft'
  | 'failed'
  | 'deleted';

@Entity('reels')
@Index(['status', 'visibility', 'createdAt'])
@Index(['creatorId', 'createdAt'])
export class Reel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  creatorId: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  @Column({ type: 'text' })
  caption: string;

  @Column({
    type: 'enum',
    enum: ['community', 'jobs', 'social'],
  })
  category: ReelCategory;

  @Column({ default: 'Original audio' })
  audioTitle: string;

  @Column({ nullable: true })
  linkedJobId: number;

  @ManyToOne(() => Job, { nullable: true })
  @JoinColumn({ name: 'linkedJobId' })
  linkedJob: Job;

  @Column({
    type: 'enum',
    enum: ['public', 'followers', 'draft'],
    default: 'public',
  })
  visibility: ReelVisibility;

  @Column({
    type: 'enum',
    enum: ['upload_pending', 'processing', 'published', 'draft', 'failed', 'deleted'],
    default: 'upload_pending',
  })
  status: ReelStatus;

  @Column({ default: true })
  allowComments: boolean;

  @Column({ default: true })
  allowSharing: boolean;

  @Column({ nullable: true, length: 2000 })
  videoUrl: string;

  @Column({ nullable: true })
  storageKey: string;

  @Column({ nullable: true })
  originalFileName: string;

  @Column({ nullable: true })
  contentType: string;

  @Column({ type: 'int', unsigned: true, nullable: true })
  fileSizeBytes: number;

  @Column({ type: 'int', unsigned: true, nullable: true })
  durationSeconds: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  likesCount: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  commentsCount: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  savesCount: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  sharesCount: number;

  @Column({ type: 'datetime', nullable: true })
  publishedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  processedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  deletedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
