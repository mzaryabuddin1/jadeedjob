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
import { ProfileType } from './profile-follow.entity';
import { User } from 'src/users/entities/user.entity';

@Entity('profile_blocks')
@Unique('UQ_profile_blocks_blocker_target', [
  'blockerUserId',
  'profileType',
  'profileId',
])
@Index('IDX_profile_blocks_target', ['profileType', 'profileId'])
export class ProfileBlock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  blockerUserId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'blockerUserId',
    foreignKeyConstraintName: 'FK_profile_blocks_blocker',
  })
  blocker: User;

  @Column({ type: 'enum', enum: ['user', 'company'] })
  profileType: ProfileType;

  @Column()
  profileId: number;

  @CreateDateColumn()
  createdAt: Date;
}
