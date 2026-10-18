import { FollowService } from './follow.service';
export declare class FollowController {
    private readonly follows;
    constructor(follows: FollowService);
    followUser(userId: number, req: any): Promise<{
        created: boolean;
        following: boolean;
        followersCount: number;
    }>;
    unfollowUser(userId: number, req: any): Promise<{
        removed: boolean;
        following: boolean;
        followersCount: number;
    }>;
    userFollowers(userId: number, before: string, limit: string, req: any): Promise<{
        total: number;
        data: import("./follow.service").PersonCard[];
        nextCursor: number;
    }>;
    userFollowing(userId: number, type: string, before: string, limit: string, req: any): Promise<{
        total: number;
        data: ({
            id: number;
            name: string;
            username: string | null;
            profile_photo: string | null;
            headline: string | null;
            isFollowing: boolean;
            isMe: boolean;
            type: "user";
        } | {
            id: number;
            page_name: string;
            username: string;
            page_logo: string | null;
            is_verified: boolean;
            followersCount: number;
            isFollowing: boolean;
            type: "page";
        })[];
        nextCursor: number;
    }>;
    followPage(pageId: number, req: any): Promise<{
        created: boolean;
        following: boolean;
        followersCount: number;
    }>;
    unfollowPage(pageId: number, req: any): Promise<{
        removed: boolean;
        following: boolean;
        followersCount: number;
    }>;
    pageFollowers(pageId: number, before: string, limit: string, req: any): Promise<{
        total: number;
        data: import("./follow.service").PersonCard[];
        nextCursor: number;
    }>;
}
