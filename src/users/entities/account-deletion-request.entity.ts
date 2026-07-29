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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
