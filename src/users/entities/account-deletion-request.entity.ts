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
import { User } from './user.entity';

@Entity('account_deletion_requests')
@Index('IDX_account_deletion_status_schedule', [
  'status',
  'scheduledDeletionAt',
])
@Index('UQ_account_deletion_active_key', ['activeKey'], { unique: true })
@Index('IDX_account_deletion_processing_claim', ['status', 'processingClaimedAt'])
export class AccountDeletionRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'FK_account_deletion_requests_user',
  })
  user: User;

  @Column({
    type: 'enum',
    enum: ['scheduled', 'recovered', 'completed', 'cancelled'],
    default: 'scheduled',
  })
  status: 'scheduled' | 'recovered' | 'completed' | 'cancelled';

  @Column({ type: 'datetime' })
  scheduledDeletionAt: Date;

  @Column({ type: 'datetime', nullable: true })
  recoveredAt: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date;

  @Column({ type: 'json', nullable: true })
  blockerSnapshot: Record<string, unknown>;

  @Column({ nullable: true, length: 80 })
  activeKey: string | null;

  @Column({ nullable: true, length: 36 })
  processingClaimToken: string | null;

  @Column({ type: 'datetime', nullable: true })
  processingClaimedAt: Date | null;

  @Column({ type: 'int', unsigned: true, default: 0 })
  processingAttempts: number;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
