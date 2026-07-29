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
    enum: ['processing', 'completed'],
    default: 'processing',
  })
  state: 'processing' | 'completed';

  @Column({ type: 'int', nullable: true })
  responseStatus: number;

  @Column({ type: 'json', nullable: true })
  responseBody: Record<string, unknown>;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
