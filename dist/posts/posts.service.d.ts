import { Repository, SelectQueryBuilder } from 'typeorm';
import { Post, PostKind, PostMedia, PostVisibility } from './entities/post.entity';
import { PostHashtag, PostLike, PostShare } from './entities/post-engagement.entities';
import { User } from 'src/users/entities/user.entity';
import { Page } from 'src/pages/entities/page.entity';
import { PageMember } from 'src/pages/entities/page-member.entity';
import { Job } from 'src/job/entities/job.entity';
import { MediaService } from 'src/media/media.service';
import { PagesService } from 'src/pages/pages.service';
import { FollowService } from 'src/follow/follow.service';
export declare const REEL_TEXT_MAX = 2200;
export declare const POST_TEXT_MAX = 3000;
export declare const REEL_DURATION_MAX_MS = 180000;
export declare function extractHashtags(text?: string | null): string[];
type CreateDto = {
    kind: PostKind;
    text?: string;
    mediaIds?: number[];
    thumbnailMediaId?: number;
    durationMs?: number;
    jobId?: number;
    pageId?: number;
    visibility?: PostVisibility;
};
export declare class PostsService {
    private readonly postRepo;
    private readonly hashtagRepo;
    private readonly likeRepo;
    private readonly shareRepo;
    private readonly userRepo;
    private readonly pageRepo;
    private readonly memberRepo;
    private readonly jobRepo;
    private readonly media;
    private readonly pagesService;
    private readonly followService;
    constructor(postRepo: Repository<Post>, hashtagRepo: Repository<PostHashtag>, likeRepo: Repository<PostLike>, shareRepo: Repository<PostShare>, userRepo: Repository<User>, pageRepo: Repository<Page>, memberRepo: Repository<PageMember>, jobRepo: Repository<Job>, media: MediaService, pagesService: PagesService, followService: FollowService);
    create(userId: number, dto: CreateDto): Promise<{
        id: number;
        kind: PostKind;
        publishedAs: string;
        visibility: PostVisibility;
        text: string;
        media: PostMedia[];
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
    update(userId: number, postId: number, dto: {
        text?: string;
        jobId?: number | null;
        visibility?: PostVisibility;
    }): Promise<{
        id: number;
        kind: PostKind;
        publishedAs: string;
        visibility: PostVisibility;
        text: string;
        media: PostMedia[];
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
    remove(userId: number, postId: number): Promise<{
        message: string;
    }>;
    private saveHashtags;
    private assertJobTag;
    requirePost(id: number, viewerId?: number): Promise<Post>;
    canManage(post: Post, userId: number): Promise<boolean>;
    private assertCanManage;
    getOne(viewerId: number, id: number): Promise<{
        id: number;
        kind: PostKind;
        publishedAs: string;
        visibility: PostVisibility;
        text: string;
        media: PostMedia[];
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
    listByUser(viewerId: number, userId: number, opts: {
        kind?: string;
        before?: number;
        limit?: number;
    }): Promise<{
        data: {
            id: number;
            kind: PostKind;
            publishedAs: string;
            visibility: PostVisibility;
            text: string;
            media: PostMedia[];
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
    listByPage(viewerId: number, pageId: number, opts: {
        kind?: string;
        before?: number;
        limit?: number;
    }): Promise<{
        data: {
            id: number;
            kind: PostKind;
            publishedAs: string;
            visibility: PostVisibility;
            text: string;
            media: PostMedia[];
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
    feed(viewerId: number, opts: {
        kind?: string;
        before?: number;
        limit?: number;
    }): Promise<{
        data: {
            id: number;
            kind: PostKind;
            publishedAs: string;
            visibility: PostVisibility;
            text: string;
            media: PostMedia[];
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
    reelsFeed(viewerId: number, opts: {
        page?: number;
        limit?: number;
    }): Promise<{
        data: {
            id: number;
            kind: PostKind;
            publishedAs: string;
            visibility: PostVisibility;
            text: string;
            media: PostMedia[];
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
    exploreFeed(viewerId: number, opts: {
        page?: number;
        limit?: number;
    }): Promise<{
        data: {
            id: number;
            kind: PostKind;
            publishedAs: string;
            visibility: PostVisibility;
            text: string;
            media: PostMedia[];
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
    private rankedFeed;
    private chronological;
    visible<T extends SelectQueryBuilder<Post>>(qb: T, viewerId: number, onlyPublic?: boolean): T;
    search(viewerId: number, q: string, opts: {
        kind?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: {
            id: number;
            kind: PostKind;
            publishedAs: string;
            visibility: PostVisibility;
            text: string;
            media: PostMedia[];
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
    hashtagSearch(prefix: string, limit?: number): Promise<{
        tag: string;
        posts: number;
    }[]>;
    trendingHashtags(days?: number, limit?: number): Promise<{
        tag: string;
        posts: number;
    }[]>;
    hydrate(posts: Post[], viewerId: number): Promise<{
        id: number;
        kind: PostKind;
        publishedAs: string;
        visibility: PostVisibility;
        text: string;
        media: PostMedia[];
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
    }[]>;
    private jobsById;
    private pageRoles;
}
export {};
