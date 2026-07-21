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
import { User } from 'src/users/entities/user.entity';

export type ProfileType = 'user' | 'company';

@Entity('profile_follows')
@Unique('UQ_profile_follows_follower_type_profile', [
  'followerUserId',
  'profileType',
  'profileId',
])
@Index('IDX_profile_follows_target_follower', [
  'profileType',
  'profileId',
  'followerUserId',
])
@Index('IDX_profile_follows_follower_target', [
  'followerUserId',
  'profileType',
  'profileId',
])
export class ProfileFollow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  followerUserId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'followerUserId',
    foreignKeyConstraintName: 'FK_profile_follows_follower_user',
  })
  follower: User;

  @Column({
    type: 'enum',
    enum: ['user', 'company'],
  })
  profileType: ProfileType;

  @Column()
  profileId: number;

  @CreateDateColumn()
  createdAt: Date;
}
