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

@Entity('auth_identities')
@Unique('UQ_auth_identities_provider_subject', ['provider', 'subject'])
@Index('IDX_auth_identities_user_provider', ['userId', 'provider'])
export class AuthIdentity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'FK_auth_identities_user',
  })
  user: User;

  @Column({ type: 'enum', enum: ['google', 'facebook'] })
  provider: 'google' | 'facebook';

  @Column({ length: 255 })
  subject: string;

  @Column({ nullable: true })
  providerEmail: string;

  @Column({ type: 'json', nullable: true })
  providerMetadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
