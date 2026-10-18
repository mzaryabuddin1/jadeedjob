import { Repository } from 'typeorm';
import { Follow, FollowTargetType } from './follow.entity';
import { User } from 'src/users/entities/user.entity';
import { Page } from 'src/pages/entities/page.entity';
import { FollowNotifier } from './follow-notifier';
export type PersonCard = {
    id: number;
    name: string;
    username: string | null;
    profile_photo: string | null;
    headline: string | null;
    isFollowing: boolean;
    isMe: boolean;
};
export type PageCard = {
    id: number;
    page_name: string;
    username: string;
    page_logo: string | null;
    is_verified: boolean;
    followersCount: number;
    isFollowing: boolean;
};
export declare const fullName: (u?: Partial<User> | null) => string;
export declare class FollowService {
    private readonly followRepo;
    private readonly userRepo;
    private readonly pageRepo;
    private readonly notifier;
    constructor(followRepo: Repository<Follow>, userRepo: Repository<User>, pageRepo: Repository<Page>, notifier: FollowNotifier);
    follow(followerId: number, type: FollowTargetType, targetId: number): Promise<{
        created: boolean;
        following: boolean;
        followersCount: number;
    }>;
    unfollow(followerId: number, type: FollowTargetType, targetId: number): Promise<{
        removed: boolean;
        following: boolean;
        followersCount: number;
    }>;
    private assertTarget;
    followersCount(type: FollowTargetType, targetId: number): Promise<number>;
    followedSet(viewerId: number, type: FollowTargetType, ids: number[]): Promise<Set<number>>;
    isFollowing(viewerId: number, type: FollowTargetType, id: number): Promise<boolean>;
    listFollowers(type: FollowTargetType, targetId: number, viewerId: number, opts?: {
        before?: number;
        limit?: number;
    }): Promise<{
        total: number;
        data: PersonCard[];
        nextCursor: number;
    }>;
    listFollowing(userId: number, kind: 'users' | 'pages' | 'all', viewerId: number, opts?: {
        before?: number;
        limit?: number;
    }): Promise<{
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
    private clampLimit;
    usersById(ids: number[]): Promise<Map<number, User>>;
    pagesById(ids: number[]): Promise<Map<number, Page>>;
    toPerson(u: User, viewerId: number, followed: Set<number>): PersonCard;
    toPageCard(p: Page, followed: Set<number>): PageCard;
}
