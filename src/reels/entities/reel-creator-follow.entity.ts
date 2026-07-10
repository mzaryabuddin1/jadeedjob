import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Entity('reel_creator_follows')
@Index('IDX_reel_creator_follows_creator_follower_unique', [
  'creatorId',
  'followerId',
], { unique: true })
@Index('IDX_reel_creator_follows_follower_creator', ['followerId', 'creatorId'])
export class ReelCreatorFollow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  creatorId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  @Column()
  followerId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'followerId' })
  follower: User;

  @CreateDateColumn()
  createdAt: Date;
}
