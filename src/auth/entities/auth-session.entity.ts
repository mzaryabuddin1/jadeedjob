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

@Entity('auth_sessions')
@Index('IDX_auth_sessions_user_installation', ['userId', 'installationId'])
@Index('IDX_auth_sessions_expiry_revoked', ['expiresAt', 'revokedAt'])
export class AuthSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'FK_auth_sessions_user',
  })
  user: User;

  @Column({ length: 120 })
  installationId: string;

  @Column({ length: 64 })
  refreshTokenHash: string;

  @Column({ type: 'int', default: 0 })
  tokenVersion: number;

  @Column({
    type: 'enum',
    enum: ['ios', 'android', 'web', 'unknown'],
    default: 'unknown',
  })
  platform: 'ios' | 'android' | 'web' | 'unknown';

  @Column({ nullable: true, length: 120 })
  deviceName: string;

  @Column({ nullable: true, length: 40 })
  appVersion: string;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'datetime', nullable: true })
  lastUsedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  revokedAt: Date;

  @Column({ nullable: true, length: 80 })
  revokedReason: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
