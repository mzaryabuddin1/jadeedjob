export type FollowTargetType = 'user' | 'page';
export declare class Follow {
    id: number;
    followerId: number;
    targetType: FollowTargetType;
    targetId: number;
    createdAt: Date;
}
