import { PostsService } from './posts.service';
export declare class PostsController {
    private readonly posts;
    constructor(posts: PostsService);
    create(body: any, req: any): Promise<{
        id: number;
        kind: import("./entities/post.entity").PostKind;
        publishedAs: string;
        visibility: import("./entities/post.entity").PostVisibility;
        text: string;
        media: import("./entities/post.entity").PostMedia[];
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
    }>;
    feed(kind: string, before: string, limit: string, req: any): Promise<{
        data: {
            id: number;
            kind: import("./entities/post.entity").PostKind;
            publishedAs: string;
            visibility: import("./entities/post.entity").PostVisibility;
            text: string;
            media: import("./entities/post.entity").PostMedia[];
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
        nextCursor: number;
    }>;
    reels(page: string, limit: string, req: any): Promise<{
        data: {
            id: number;
            kind: import("./entities/post.entity").PostKind;
            publishedAs: string;
            visibility: import("./entities/post.entity").PostVisibility;
            text: string;
            media: import("./entities/post.entity").PostMedia[];
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
    explore(page: string, limit: string, req: any): Promise<{
        data: {
            id: number;
            kind: import("./entities/post.entity").PostKind;
            publishedAs: string;
            visibility: import("./entities/post.entity").PostVisibility;
            text: string;
            media: import("./entities/post.entity").PostMedia[];
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
    getOne(id: number, req: any): Promise<{
        id: number;
        kind: import("./entities/post.entity").PostKind;
        publishedAs: string;
        visibility: import("./entities/post.entity").PostVisibility;
        text: string;
        media: import("./entities/post.entity").PostMedia[];
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
    }>;
    update(id: number, body: any, req: any): Promise<{
        id: number;
        kind: import("./entities/post.entity").PostKind;
        publishedAs: string;
        visibility: import("./entities/post.entity").PostVisibility;
        text: string;
        media: import("./entities/post.entity").PostMedia[];
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
    }>;
    remove(id: number, req: any): Promise<{
        message: string;
    }>;
    userPosts(userId: number, kind: string, before: string, limit: string, req: any): Promise<{
        data: {
            id: number;
            kind: import("./entities/post.entity").PostKind;
            publishedAs: string;
            visibility: import("./entities/post.entity").PostVisibility;
            text: string;
            media: import("./entities/post.entity").PostMedia[];
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
        nextCursor: number;
    }>;
    pagePosts(pageId: number, kind: string, before: string, limit: string, req: any): Promise<{
        data: {
            id: number;
            kind: import("./entities/post.entity").PostKind;
            publishedAs: string;
            visibility: import("./entities/post.entity").PostVisibility;
            text: string;
            media: import("./entities/post.entity").PostMedia[];
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
        nextCursor: number;
    }>;
}
