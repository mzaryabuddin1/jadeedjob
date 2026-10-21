import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { PostComment, PostLike, PostShare } from './entities/post-engagement.entities';
import { PostsService } from './posts.service';
import { PostStatsService } from './post-stats.service';
import { PostEngagementNotifier } from './post-engagement-notifier';
import { FollowService } from 'src/follow/follow.service';
export declare const COMMENT_MAX = 1000;
export declare const SHARE_CHANNELS: readonly ["link", "chat", "external"];
export declare class PostEngagementService {
    private readonly postRepo;
    private readonly likeRepo;
    private readonly commentRepo;
    private readonly shareRepo;
    private readonly posts;
    private readonly stats;
    private readonly notifier;
    private readonly followService;
    constructor(postRepo: Repository<Post>, likeRepo: Repository<PostLike>, commentRepo: Repository<PostComment>, shareRepo: Repository<PostShare>, posts: PostsService, stats: PostStatsService, notifier: PostEngagementNotifier, followService: FollowService);
    private counts;
    like(userId: number, postId: number): Promise<{
        liked: boolean;
        created: boolean;
        likesCount: number;
    }>;
    unlike(userId: number, postId: number): Promise<{
        liked: boolean;
        removed: boolean;
        likesCount: number;
    }>;
    listLikes(postId: number, viewerId: number, opts: {
        before?: number;
        limit?: number;
    }): Promise<{
        total: number;
        data: import("src/follow/follow.service").PersonCard[];
        nextCursor: number;
    }>;
    comment(userId: number, postId: number, text: string, parentId?: number): Promise<{
        id: number;
        postId: number;
        parentId: number;
        text: string;
        repliesCount: number;
        createdAt: Date;
        user: {
            id: number;
            name: string;
            username: string;
            profile_photo: string;
        };
        canDelete: boolean;
    }>;
    listComments(postId: number, viewerId: number, opts: {
        before?: number;
        limit?: number;
    }): Promise<{
        total: number;
        data: {
            id: number;
            postId: number;
            parentId: number;
            text: string;
            repliesCount: number;
            createdAt: Date;
            user: {
                id: number;
                name: string;
                username: string;
                profile_photo: string;
            };
            canDelete: boolean;
        }[];
        nextCursor: number;
    }>;
    listReplies(commentId: number, viewerId: number, opts: {
        after?: number;
        limit?: number;
    }): Promise<{
        data: {
            id: number;
            postId: number;
            parentId: number;
            text: string;
            repliesCount: number;
            createdAt: Date;
            user: {
                id: number;
                name: string;
                username: string;
                profile_photo: string;
            };
            canDelete: boolean;
        }[];
        nextCursor: number;
    }>;
    deleteComment(userId: number, commentId: number): Promise<{
        message: string;
        removed: number;
    }>;
    private visibleComments;
    private commentViews;
    shareUrl(postId: number): string;
    share(userId: number, postId: number, channel: string): Promise<{
        shared: boolean;
        created: boolean;
        sharesCount: number;
        shareUrl: string;
    }>;
    shareLink(postId: number, viewerId: number): Promise<{
        shareUrl: string;
    }>;
}
