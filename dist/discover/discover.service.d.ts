import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Page } from 'src/pages/entities/page.entity';
import { FollowService } from 'src/follow/follow.service';
import { PostsService } from 'src/posts/posts.service';
export declare const escapeLike: (s: string) => string;
export declare function cleanQuery(q: unknown, min?: number): string;
export declare function pageWindow(page?: unknown, limit?: unknown): {
    take: number;
    current: number;
    offset: number;
};
export declare class DiscoverService {
    private readonly userRepo;
    private readonly pageRepo;
    private readonly followService;
    private readonly postsService;
    constructor(userRepo: Repository<User>, pageRepo: Repository<Page>, followService: FollowService, postsService: PostsService);
    searchUsers(q: string, viewerId: number, opts?: {
        page?: unknown;
        limit?: unknown;
    }): Promise<{
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
    searchPages(q: string, viewerId: number, opts?: {
        page?: unknown;
        limit?: unknown;
    }): Promise<{
        data: import("src/follow/follow.service").PageCard[];
        page: number;
        limit: number;
        hasMore: boolean;
    }>;
    searchPosts(q: string, viewerId: number, opts: {
        kind?: string;
        page?: unknown;
        limit?: unknown;
    }): Promise<{
        data: {
            id: number;
            kind: import("../posts/entities/post.entity").PostKind;
            publishedAs: string;
            visibility: import("../posts/entities/post.entity").PostVisibility;
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
    searchAll(q: string, viewerId: number): Promise<{
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
        pages: import("src/follow/follow.service").PageCard[];
        posts: {
            id: number;
            kind: import("../posts/entities/post.entity").PostKind;
            publishedAs: string;
            visibility: import("../posts/entities/post.entity").PostVisibility;
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
            visibility: import("../posts/entities/post.entity").PostVisibility;
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
    home(viewerId: number): Promise<{
        trendingHashtags: {
            tag: string;
            posts: number;
        }[];
        trendingReels: {
            id: number;
            kind: import("../posts/entities/post.entity").PostKind;
            publishedAs: string;
            visibility: import("../posts/entities/post.entity").PostVisibility;
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
        suggestedPages: import("src/follow/follow.service").PageCard[];
    }>;
    suggestedUsers(viewerId: number, limit?: number): Promise<{
        followersCount: number;
        id: number;
        name: string;
        username: string | null;
        profile_photo: string | null;
        headline: string | null;
        isFollowing: boolean;
        isMe: boolean;
    }[]>;
    suggestedPages(viewerId: number, limit?: number): Promise<import("src/follow/follow.service").PageCard[]>;
    fullName: (u?: Partial<User> | null) => string;
}
