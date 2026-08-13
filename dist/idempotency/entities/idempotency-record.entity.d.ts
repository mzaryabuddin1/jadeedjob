import { User } from 'src/users/entities/user.entity';
export declare class IdempotencyRecord {
    id: number;
    userId: number;
    user: User;
    scope: string;
    requestKey: string;
    requestHash: string;
    state: 'processing' | 'completed' | 'failed';
    leaseId: string | null;
    leaseExpiresAt: Date | null;
    attemptCount: number;
    responseStatus: number;
    responseBody: Record<string, unknown>;
    responseHeaders: Record<string, string> | null;
    completedAt: Date | null;
    lastErrorCode: string | null;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
