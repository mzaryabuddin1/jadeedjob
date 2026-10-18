import { PostAnalyticsService } from './post-analytics.service';
export declare class PostAnalyticsController {
    private readonly analytics;
    constructor(analytics: PostAnalyticsService);
    events(body: any, req: any): Promise<{
        accepted: number;
        ignored: number;
    }>;
    postAnalytics(id: number, days: string, req: any): Promise<{
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
    overview(days: string, pageId: string, req: any): Promise<{
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
}
