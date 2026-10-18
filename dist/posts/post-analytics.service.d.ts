import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { PostStatsDaily } from './entities/post-engagement.entities';
import { PostsService } from './posts.service';
import { PostStatsService } from './post-stats.service';
import { Follow } from 'src/follow/follow.entity';
import { User } from 'src/users/entities/user.entity';
import { Page } from 'src/pages/entities/page.entity';
import { PagesService } from 'src/pages/pages.service';
export type ViewEvent = {
    postId: number;
    type: 'impression' | 'view';
    watchMs?: number;
    completed?: boolean;
};
export declare class PostAnalyticsService {
    private readonly postRepo;
    private readonly statsRepo;
    private readonly followRepo;
    private readonly userRepo;
    private readonly pageRepo;
    private readonly posts;
    private readonly stats;
    private readonly pagesService;
    constructor(postRepo: Repository<Post>, statsRepo: Repository<PostStatsDaily>, followRepo: Repository<Follow>, userRepo: Repository<User>, pageRepo: Repository<Page>, posts: PostsService, stats: PostStatsService, pagesService: PagesService);
    record(viewerId: number, events: ViewEvent[]): Promise<{
        accepted: number;
        ignored: number;
    }>;
    private assertCanSee;
    private period;
    postAnalytics(userId: number, postId: number, days: number): Promise<{
        post: {
            id: number;
            kind: import("./entities/post.entity").PostKind;
            text: string;
            thumbnail: string;
            createdAt: Date;
        };
        period: {
            days: number;
            from: string;
            to: string;
        };
        totals: {
            impressions: number;
            views: number;
            newViewers: number;
            watchTimeMs: number;
            completions: number;
            likes: number;
            comments: number;
            shares: number;
        };
        rates: {
            viewRate: number;
            avgWatchMs: number;
            completionRate: number;
            engagementRate: number;
        };
        lifetime: {
            impressions: number;
            views: number;
            reach: number;
            likes: number;
            comments: number;
            shares: number;
            watchTimeMs: number;
            completions: number;
        };
        daily: {
            day: string;
            impressions: number;
            views: number;
            newViewers: number;
            watchTimeMs: number;
            completions: number;
            likes: number;
            comments: number;
            shares: number;
        }[];
    }>;
    private sum;
    private rates;
    overview(userId: number, days: number, pageId?: number): Promise<{
        scope: {
            type: string;
            pageId: number;
            userId?: undefined;
        } | {
            type: string;
            userId: number;
            pageId?: undefined;
        };
        period: {
            days: number;
            from: string;
            to: string;
        };
        totals: {
            impressions: number;
            views: number;
            newViewers: number;
            watchTimeMs: number;
            completions: number;
            likes: number;
            comments: number;
            shares: number;
        };
        rates: {
            viewRate: number;
            avgWatchMs: number;
            completionRate: number;
            engagementRate: number;
        };
        byKind: Record<string, any>;
        followers: {
            total: number;
            gained: number;
            daily: {
                day: string;
                gained: number;
            }[];
        };
        published: number;
        topPosts: {
            id: number;
            kind: import("./entities/post.entity").PostKind;
            text: string;
            thumbnail: string;
            views: number;
            interactions: number;
        }[];
        daily: {
            impressions: number;
            views: number;
            newViewers: number;
            watchTimeMs: number;
            completions: number;
            likes: number;
            comments: number;
            shares: number;
            day: string;
        }[];
    }>;
    assertEvents(events: unknown): asserts events is ViewEvent[];
}
