import { Reel } from './reel.entity';
import { User } from 'src/users/entities/user.entity';
export declare class ReelLike {
    id: number;
    reelId: number;
    reel: Reel;
    userId: number;
    user: User;
    createdAt: Date;
}
