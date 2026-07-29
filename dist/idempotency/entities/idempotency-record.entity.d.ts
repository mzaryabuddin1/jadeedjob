import { User } from 'src/users/entities/user.entity';
export declare class IdempotencyRecord {
    id: number;
    userId: number;
    user: User;
    scope: string;
    requestKey: string;
    requestHash: string;
    state: 'processing' | 'completed';
    responseStatus: number;
    responseBody: Record<string, unknown>;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
