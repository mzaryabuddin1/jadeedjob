import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

export type FollowTargetType = 'user' | 'page';

/**
 * "A follows B" where B is a user or a page. One row per pair; the unique key
 * makes follow idempotent and race-safe.
 */
@Entity('follows')
@Unique('UQ_follow_pair', ['followerId', 'targetType', 'targetId'])
@Index('IDX_follow_target', ['targetType', 'targetId', 'id'])
@Index('IDX_follow_follower', ['followerId', 'targetType', 'id'])
export class Follow {
  @PrimaryGeneratedColumn()
  id: number;

  /** The user who follows */
  @Column()
  followerId: number;

  @Column({ type: 'varchar', length: 4 })
  targetType: FollowTargetType;

  /** user id or page id, depending on targetType */
  @Column()
  targetId: number;

  @CreateDateColumn()
  createdAt: Date;
}
