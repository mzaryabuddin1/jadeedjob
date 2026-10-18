import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostStatsDaily } from './entities/post-engagement.entities';

export type StatDelta = Partial<
  Record<
    | 'impressions'
    | 'views'
    | 'newViewers'
    | 'watchTimeMs'
    | 'completions'
    | 'likes'
    | 'comments'
    | 'shares',
    number
  >
>;

const COLUMNS = [
  'impressions',
  'views',
  'newViewers',
  'watchTimeMs',
  'completions',
  'likes',
  'comments',
  'shares',
] as const;

/** Adds numbers to today's (UTC) row of a post, creating it when needed */
@Injectable()
export class PostStatsService {
  constructor(
    @InjectRepository(PostStatsDaily)
    private readonly repo: Repository<PostStatsDaily>,
  ) {}

  async bump(postId: number, delta: StatDelta) {
    const values = COLUMNS.map((c) => Math.max(0, Math.round(delta[c] ?? 0)));
    if (!values.some(Boolean)) return;

    // one atomic statement - safe under many concurrent likes / views
    await this.repo.query(
      `INSERT INTO post_stats_daily
         (postId, day, ${COLUMNS.join(', ')})
       VALUES (?, UTC_DATE(), ${COLUMNS.map(() => '?').join(', ')})
       ON DUPLICATE KEY UPDATE
         ${COLUMNS.map((c) => `${c} = ${c} + VALUES(${c})`).join(', ')}`,
      [postId, ...values],
    );
  }
}
