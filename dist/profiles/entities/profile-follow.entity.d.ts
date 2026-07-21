import { User } from 'src/users/entities/user.entity';
export type ProfileType = 'user' | 'company';
export declare class ProfileFollow {
    id: number;
    followerUserId: number;
    follower: User;
    profileType: ProfileType;
    profileId: number;
    createdAt: Date;
}
