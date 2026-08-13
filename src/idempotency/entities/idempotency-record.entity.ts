import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Entity('idempotency_records')
@Unique('UQ_idempotency_user_scope_key', ['userId', 'scope', 'requestKey'])
@Index('IDX_idempotency_expiry', ['expiresAt'])
@Index('IDX_idempotency_state_lease', ['state', 'leaseExpiresAt'])
export class IdempotencyRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'FK_idempotency_records_user',
  })
  user: User;

  @Column({ length: 80 })
  scope: string;

  @Column({ length: 120 })
  requestKey: string;

  @Column({ length: 64 })
  requestHash: string;

  @Column({
    type: 'enum',
    enum: ['processing', 'completed', 'failed'],
    default: 'processing',
  })
  state: 'processing' | 'completed' | 'failed';

  @Column({ nullable: true, length: 36 })
  leaseId: string | null;

  @Column({ type: 'datetime', nullable: true })
  leaseExpiresAt: Date | null;

  @Column({ type: 'int', unsigned: true, default: 1 })
  attemptCount: number;

  @Column({ type: 'int', nullable: true })
  responseStatus: number;

  @Column({ type: 'json', nullable: true })
  responseBody: Record<string, unknown>;

  @Column({ type: 'json', nullable: true })
  responseHeaders: Record<string, string> | null;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  lastErrorCode: string | null;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
