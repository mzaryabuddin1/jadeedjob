import { Repository } from 'typeorm';
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
import { Page } from 'src/pages/entities/page.entity';
import { Job } from 'src/job/entities/job.entity';

export type PostKind = 'post' | 'reel';

/** One uploaded file attached to a post (copied from `media_files` at publish time) */
export type PostMedia = {
  id: number;
  kind: 'image' | 'video';
  url: string;
  mimeType: string;
  size: number;
  /** cover image of a video */
  thumbnailUrl?: string | null;
};

const bigint = {
  to: (v: number) => v,
  from: (v: string | number | null) => (v == null ? 0 : Number(v)),
};

/**
 * Posts and reels are the same thing with a different `kind`: a reel is one
 * vertical video, a post is text and/or up to 10 images (or one video).
 * Published by a person, or as a page (`pageId`) the person manages.
 */
@Entity('posts')
@Index('IDX_post_kind_time', ['kind', 'deletedAt', 'id'])
@Index('IDX_post_author', ['authorId', 'id'])
@Index('IDX_post_page', ['pageId', 'id'])
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 4 })
  kind: PostKind;

  /** The person who published it (also for page posts) */
  @Column()
  authorId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author: User;

  /** Set when published as a page */
  @Column({ type: 'int', nullable: true })
  pageId: number | null;

  @ManyToOne(() => Page, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pageId' })
  page: Page | null;

  /** Caption / text */
  @Column({ type: 'text', nullable: true })
  text: string | null;

  @Column({ type: 'json' })
  media: PostMedia[];

  /** Length of the reel video in ms (reported by the app) */
  @Column({ type: 'int', nullable: true })
  durationMs: number | null;

  /** A job the author promotes with this post */
  @Column({ type: 'int', nullable: true })
  jobId: number | null;

  @ManyToOne(() => Job, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'jobId' })
  job: Job | null;

  // ── cached counters (updated together with the event rows) ──
  @Column({ type: 'int', default: 0 })
  likesCount: number;

  @Column({ type: 'int', default: 0 })
  commentsCount: number;

  @Column({ type: 'int', default: 0 })
  sharesCount: number;

  /** meaningful views (a reel watched / a post opened) */
  @Column({ type: 'int', default: 0 })
  viewsCount: number;

  /** times it was shown in a feed */
  @Column({ type: 'int', default: 0 })
  impressionsCount: number;

  /** unique people who viewed it */
  @Column({ type: 'int', default: 0 })
  reachCount: number;

  @Column({ type: 'bigint', default: 0, transformer: bigint })
  watchTimeMs: number;

  /** views that watched a reel to the end */
  @Column({ type: 'int', default: 0 })
  completionsCount: number;

  /** soft delete: the row stays for analytics, the post disappears */
  @Column({ type: 'datetime', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/** live posts and reels of an author (or of a page) */
export async function countContent(
  repo: Repository<Post>,
  where: { userId: number } | { pageId: number },
) {
  const qb = repo
    .createQueryBuilder('p')
    .select('p.kind', 'kind')
    .addSelect('COUNT(*)', 'n')
    .where('p.deletedAt IS NULL');
  if ('userId' in where) {
    qb.andWhere('p.authorId = :id AND p.pageId IS NULL', { id: where.userId });
  } else {
    qb.andWhere('p.pageId = :id', { id: where.pageId });
  }
  const rows = await qb.groupBy('p.kind').getRawMany();
  const n = (k: string) => Number(rows.find((r) => r.kind === k)?.n ?? 0);
  return { posts: n('post'), reels: n('reel') };
}
