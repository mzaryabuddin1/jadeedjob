import { PostEngagementService } from './post-engagement.service';
export declare class PostEngagementController {
    private readonly engagement;
    constructor(engagement: PostEngagementService);
    like(id: number, req: any): Promise<{
        liked: boolean;
        created: boolean;
        likesCount: number;
    }>;
    unlike(id: number, req: any): Promise<{
        liked: boolean;
        removed: boolean;
        likesCount: number;
    }>;
    likes(id: number, before: string, limit: string, req: any): Promise<{
        total: number;
        data: import("../follow/follow.service").PersonCard[];
        nextCursor: number;
    }>;
    comment(id: number, body: any, req: any): Promise<{
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
    comments(id: number, before: string, limit: string, req: any): Promise<{
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
    replies(commentId: number, after: string, limit: string, req: any): Promise<{
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
    deleteComment(commentId: number, req: any): Promise<{
        message: string;
        removed: number;
    }>;
    share(id: number, body: any, req: any): Promise<{
        shared: boolean;
        created: boolean;
        sharesCount: number;
        shareUrl: string;
    }>;
    shareLink(id: number, req: any): Promise<{
        shareUrl: string;
    }>;
}
