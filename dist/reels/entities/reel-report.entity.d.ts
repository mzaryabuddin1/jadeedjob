import { User } from 'src/users/entities/user.entity';
import { Reel } from './reel.entity';
export declare class ReelReport {
    id: number;
    reelId: number;
    reel: Reel;
    reporterUserId: number;
    reporter: User;
    reason: 'spam' | 'unsafe' | 'false_information' | 'other';
    details: string;
    status: 'pending' | 'reviewed' | 'dismissed' | 'actioned';
    resolvedByAdminId: number;
    resolvedByAdmin: User;
    resolutionNote: string;
    resolvedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
