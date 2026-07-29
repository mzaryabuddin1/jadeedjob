import { ProfileType } from './profile-follow.entity';
import { User } from 'src/users/entities/user.entity';
export declare class ProfileBlock {
    id: number;
    blockerUserId: number;
    blocker: User;
    profileType: ProfileType;
    profileId: number;
    createdAt: Date;
}
