import { User } from 'src/users/entities/user.entity';
export declare class AuthSession {
    id: string;
    userId: number;
    user: User;
    installationId: string;
    refreshTokenHash: string;
    tokenVersion: number;
    platform: 'ios' | 'android' | 'web' | 'unknown';
    deviceName: string;
    appVersion: string;
    expiresAt: Date;
    lastUsedAt: Date;
    revokedAt: Date;
    revokedReason: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
