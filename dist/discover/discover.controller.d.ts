import { DiscoverService } from './discover.service';
export declare class DiscoverController {
    private readonly discover;
    constructor(discover: DiscoverService);
    users(q: string, page: string, limit: string, req: any): Promise<{
        data: {
            followersCount: number;
            open_to_work: boolean;
            id: number;
            name: string;
            username: string | null;
            profile_photo: string | null;
            headline: string | null;
            isFollowing: boolean;
            isMe: boolean;
        }[];
        page: number;
        limit: number;
        hasMore: boolean;
    }>;
    pages(q: string, page: string, limit: string, req: any): Promise<{
        data: import("../follow/follow.service").PageCard[];
        page: number;
        limit: number;
        hasMore: boolean;
    }>;
    posts(q: string, kind: string, page: string, limit: string, req: any): Promise<{
        data: {
            id: number;
            kind: import("../posts/entities/post.entity").PostKind;
            publishedAs: string;
            text: string;
            media: import("../posts/entities/post.entity").PostMedia[];
            durationMs: number;
            hashtags: string[];
            author: {
                id: number;
                name: string;
                username: string;
                profile_photo: string;
                headline: string;
                isFollowing: boolean;
                isMe: boolean;
            };
            page: {
                id: number;
                page_name: string;
                username: string;
                page_logo: string;
                is_verified: boolean;
                isFollowing: boolean;
            };
            job: any;
            counts: {
                likes: number;
                comments: number;
                shares: number;
                views: number;
            };
            viewer: {
                liked: boolean;
                shared: boolean;
                canManage: boolean;
            };
            createdAt: Date;
        }[];
        page: number;
        limit: number;
        hasMore: boolean;
    }>;
    reels(q: string, page: string, limit: string, req: any): Promise<{
        data: {
            id: number;
            kind: import("../posts/entities/post.entity").PostKind;
            publishedAs: string;
            text: string;
            media: import("../posts/entities/post.entity").PostMedia[];
            durationMs: number;
            hashtags: string[];
            author: {
                id: number;
                name: string;
                username: string;
                profile_photo: string;
                headline: string;
                isFollowing: boolean;
                isMe: boolean;
            };
            page: {
                id: number;
                page_name: string;
                username: string;
                page_logo: string;
                is_verified: boolean;
                isFollowing: boolean;
            };
            job: any;
            counts: {
                likes: number;
                comments: number;
                shares: number;
                views: number;
            };
            viewer: {
                liked: boolean;
                shared: boolean;
                canManage: boolean;
            };
            createdAt: Date;
        }[];
        page: number;
        limit: number;
        hasMore: boolean;
    }>;
    hashtags(q: string): Promise<{
        tag: string;
        posts: number;
    }[]>;
    search(q: string, req: any): Promise<{
        query: string;
        users: {
            followersCount: number;
            open_to_work: boolean;
            id: number;
            name: string;
            username: string | null;
            profile_photo: string | null;
            headline: string | null;
            isFollowing: boolean;
            isMe: boolean;
        }[];
        pages: import("../follow/follow.service").PageCard[];
        posts: {
            id: number;
            kind: import("../posts/entities/post.entity").PostKind;
            publishedAs: string;
            text: string;
            media: import("../posts/entities/post.entity").PostMedia[];
            durationMs: number;
            hashtags: string[];
            author: {
                id: number;
                name: string;
                username: string;
                profile_photo: string;
                headline: string;
                isFollowing: boolean;
                isMe: boolean;
            };
            page: {
                id: number;
                page_name: string;
                username: string;
                page_logo: string;
                is_verified: boolean;
                isFollowing: boolean;
            };
            job: any;
            counts: {
                likes: number;
                comments: number;
                shares: number;
                views: number;
            };
            viewer: {
                liked: boolean;
                shared: boolean;
                canManage: boolean;
            };
            createdAt: Date;
        }[];
        reels: {
            id: number;
            kind: import("../posts/entities/post.entity").PostKind;
            publishedAs: string;
            text: string;
            media: import("../posts/entities/post.entity").PostMedia[];
            durationMs: number;
            hashtags: string[];
            author: {
                id: number;
                name: string;
                username: string;
                profile_photo: string;
                headline: string;
                isFollowing: boolean;
                isMe: boolean;
            };
            page: {
                id: number;
                page_name: string;
                username: string;
                page_logo: string;
                is_verified: boolean;
                isFollowing: boolean;
            };
            job: any;
            counts: {
                likes: number;
                comments: number;
                shares: number;
                views: number;
            };
            viewer: {
                liked: boolean;
                shared: boolean;
                canManage: boolean;
            };
            createdAt: Date;
        }[];
        hashtags: {
            tag: string;
            posts: number;
        }[];
    }>;
    home(req: any): Promise<{
        trendingHashtags: {
            tag: string;
            posts: number;
        }[];
        trendingReels: {
            id: number;
            kind: import("../posts/entities/post.entity").PostKind;
            publishedAs: string;
            text: string;
            media: import("../posts/entities/post.entity").PostMedia[];
            durationMs: number;
            hashtags: string[];
            author: {
                id: number;
                name: string;
                username: string;
                profile_photo: string;
                headline: string;
                isFollowing: boolean;
                isMe: boolean;
            };
            page: {
                id: number;
                page_name: string;
                username: string;
                page_logo: string;
                is_verified: boolean;
                isFollowing: boolean;
            };
            job: any;
            counts: {
                likes: number;
                comments: number;
                shares: number;
                views: number;
            };
            viewer: {
                liked: boolean;
                shared: boolean;
                canManage: boolean;
            };
            createdAt: Date;
        }[];
        suggestedUsers: {
            followersCount: number;
            id: number;
            name: string;
            username: string | null;
            profile_photo: string | null;
            headline: string | null;
            isFollowing: boolean;
            isMe: boolean;
        }[];
        suggestedPages: import("../follow/follow.service").PageCard[];
    }>;
}
