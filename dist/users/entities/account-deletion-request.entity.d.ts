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
    activeKey: string | null;
    processingClaimToken: string | null;
    processingClaimedAt: Date | null;
    processingAttempts: number;
    lastError: string | null;
    createdAt: Date;
    updatedAt: Date;
}
