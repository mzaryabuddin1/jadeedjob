import { User } from './user.entity';
export declare class AccountDeletionRequest {
    id: number;
    userId: number;
    user: User;
    status: 'scheduled' | 'recovered' | 'completed' | 'cancelled';
    scheduledDeletionAt: Date;
    recoveredAt: Date;
    completedAt: Date;
    blockerSnapshot: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
