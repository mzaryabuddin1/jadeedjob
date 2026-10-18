import { Repository } from 'typeorm';
import { PostStatsDaily } from './entities/post-engagement.entities';
export type StatDelta = Partial<Record<'impressions' | 'views' | 'newViewers' | 'watchTimeMs' | 'completions' | 'likes' | 'comments' | 'shares', number>>;
export declare class PostStatsService {
    private readonly repo;
    constructor(repo: Repository<PostStatsDaily>);
    bump(postId: number, delta: StatDelta): Promise<void>;
}
