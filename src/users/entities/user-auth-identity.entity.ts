import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

export type AuthProviderType = 'google' | 'facebook';

/**
 * Linked login methods for a single permanent user.
 * Multiple Google / Facebook identities can point to the same userId.
 * (provider, providerId) is globally unique — one social account → one user.
 */
@Entity('user_auth_identities')
@Unique('UQ_auth_identity_provider_providerId', ['provider', 'providerId'])
@Index('IDX_auth_identity_user', ['userId'])
export class UserAuthIdentity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne('User', 'authIdentities', {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 20 })
  provider: AuthProviderType;

  /** Google `sub` or Facebook user id */
  @Column({ type: 'varchar', length: 191 })
  providerId: string;

  /** Email reported by that provider (informational; not used for auto-link) */
  @Column({ type: 'varchar', length: 255, nullable: true })
  providerEmail: string | null;

  @CreateDateColumn()
  linkedAt: Date;
}
