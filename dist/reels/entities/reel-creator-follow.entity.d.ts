import { User } from 'src/users/entities/user.entity';
export declare class ReelCreatorFollow {
    id: number;
    creatorId: number;
    creator: User;
    followerId: number;
    follower: User;
    createdAt: Date;
}
