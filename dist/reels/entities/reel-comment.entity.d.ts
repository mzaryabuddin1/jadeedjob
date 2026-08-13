import { Reel } from './reel.entity';
import { User } from 'src/users/entities/user.entity';
export declare class ReelComment {
    id: number;
    reelId: number;
    reel: Reel;
    userId: number;
    user: User;
    text: string;
    moderationStatus: 'visible' | 'hidden' | 'removed';
    deletedAt: Date | null;
    deletedByUserId: number | null;
    deletionReason: string | null;
    createdAt: Date;
}
