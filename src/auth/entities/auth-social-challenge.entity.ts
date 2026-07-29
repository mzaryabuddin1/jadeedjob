import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity('auth_social_challenges')
@Index('IDX_auth_social_challenges_expiry_used', ['expiresAt', 'usedAt'])
export class AuthSocialChallenge {
  @PrimaryColumn({ length: 36 })
  id: string;

  @Column({ type: 'enum', enum: ['google', 'facebook'] })
  provider: 'google' | 'facebook';

  @Column({ length: 255 })
  subject: string;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'datetime', nullable: true })
  usedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
