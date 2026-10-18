import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Post } from './post.entity';
import { User } from 'src/users/entities/user.entity';

const bigint = {
  to: (v: number) => v,
  from: (v: string | number | null) => (v == null ? 0 : Number(v)),
};

@Entity('post_likes')
@Unique('UQ_post_like', ['postId', 'userId'])
@Index('IDX_post_like_user', ['userId'])
export class PostLike {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  postId: number;

  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}

/** A comment, or a reply (one level: replies to a reply attach to the top comment) */
@Entity('post_comments')
@Index('IDX_post_comment_thread', ['postId', 'parentId', 'id'])
export class PostComment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  postId: number;

  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'int', nullable: true })
  parentId: number | null;

  @Column({ type: 'varchar', length: 1000 })
  text: string;

  @Column({ type: 'int', default: 0 })
  repliesCount: number;

  @Column({ type: 'datetime', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}

/** "Shared" - one row per person per post (a person counts once, however often they share) */
@Entity('post_shares')
@Unique('UQ_post_share', ['postId', 'userId'])
export class PostShare {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  postId: number;

  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 10, default: 'link' })
  channel: string;

  @CreateDateColumn()
  createdAt: Date;
}

/** Unique viewers of a post (= its reach). One row per person per post. */
@Entity('post_viewers')
export class PostViewer {
  @PrimaryColumn()
  postId: number;

  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post;

  @PrimaryColumn()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'datetime' })
  firstSeenAt: Date;
}

/** Per-post, per-UTC-day performance numbers (the analytics time series) */
@Entity('post_stats_daily')
export class PostStatsDaily {
  @PrimaryColumn()
  postId: number;

  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post;

  @PrimaryColumn({ type: 'date' })
  day: string;

  @Column({ type: 'int', default: 0 })
  impressions: number;

  @Column({ type: 'int', default: 0 })
  views: number;

  /** people who viewed for the FIRST time that day */
  @Column({ type: 'int', default: 0 })
  newViewers: number;

  @Column({ type: 'bigint', default: 0, transformer: bigint })
  watchTimeMs: number;

  @Column({ type: 'int', default: 0 })
  completions: number;

  /** new likes that day (never reduced by unlikes) */
  @Column({ type: 'int', default: 0 })
  likes: number;

  @Column({ type: 'int', default: 0 })
  comments: number;

  @Column({ type: 'int', default: 0 })
  shares: number;
}

@Entity('post_hashtags')
@Index('IDX_post_hashtag_tag', ['tag', 'postId'])
export class PostHashtag {
  @PrimaryColumn()
  postId: number;

  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post;

  @PrimaryColumn({ type: 'varchar', length: 50 })
  tag: string;
}
