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
import { User } from 'src/users/entities/user.entity';

export type ModerationTargetType =
  | 'post'
  | 'post_comment'
  | 'reel'
  | 'reel_comment'
  | 'user'
  | 'company'
  | 'chat_message'
  | 'job';

export type ModerationReportStatus = 'pending' | 'dismissed' | 'actioned';

export type ModerationAction =
  | 'dismiss'
  | 'hide'
  | 'remove'
  | 'warn'
  | 'suspend'
  | 'ban';

@Entity('moderation_reports')
@Index('IDX_moderation_reports_status_created', ['status', 'createdAt'])
@Index('IDX_moderation_reports_target', ['targetType', 'targetId'])
@Index('UQ_moderation_reports_active_key', ['activeKey'], { unique: true })
@Index('UQ_moderation_reports_legacy_source', ['legacySourceType', 'legacySourceId'], {
  unique: true,
})
export class ModerationReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: [
      'post',
      'post_comment',
      'reel',
      'reel_comment',
      'user',
      'company',
      'chat_message',
      'job',
    ],
  })
  targetType: ModerationTargetType;

  @Column({ length: 64 })
  targetId: string;

  @Column()
  reporterUserId: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'reporterUserId',
    foreignKeyConstraintName: 'FK_moderation_reports_reporter',
  })
  reporter: User;

  @Column({ nullable: true })
  targetOwnerUserId: number | null;

  @Column({ nullable: true })
  targetCompanyId: number | null;

  @Column({ nullable: true, length: 255 })
  activeKey: string | null;

  @Column({ nullable: true, length: 40 })
  legacySourceType: 'post_report' | 'reel_report' | null;

  @Column({ nullable: true })
  legacySourceId: number | null;

  @Column({ length: 80 })
  reason: string;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @Column({ type: 'json', nullable: true })
  targetSnapshot: Record<string, unknown> | null;

  @Column({
    type: 'enum',
    enum: ['pending', 'dismissed', 'actioned'],
    default: 'pending',
  })
  status: ModerationReportStatus;

  @Column({
    type: 'enum',
    enum: ['dismiss', 'hide', 'remove', 'warn', 'suspend', 'ban'],
    nullable: true,
  })
  action: ModerationAction | null;

  @Column({ nullable: true })
  reviewedByAdminId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'reviewedByAdminId',
    foreignKeyConstraintName: 'FK_moderation_reports_reviewer',
  })
  reviewer: User | null;

  @Column({ type: 'text', nullable: true })
  resolutionNotes: string | null;

  @Column({ type: 'datetime', nullable: true })
  suspensionEndsAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
