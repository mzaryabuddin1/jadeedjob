import { JwtPayload } from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { AuthSession } from './entities/auth-session.entity';
export type AuthenticatedUserPayload = JwtPayload & {
    id: number;
    sid?: string;
    tokenVersion: number;
    systemRole: 'user' | 'admin';
};
export type SessionDeviceInput = {
    installationId?: string;
    platform?: 'ios' | 'android' | 'web' | 'unknown';
    deviceName?: string;
    appVersion?: string;
};
export declare class AuthSessionService {
    private readonly userRepo;
    private readonly sessionRepo;
    private readonly accessTokenExpiresIn;
    private readonly refreshTokenLifetimeMs;
    constructor(userRepo: Repository<User>, sessionRepo: Repository<AuthSession>);
    getBearerToken(authHeader: string | string[] | undefined): string;
    validateAuthorizationHeader(authHeader: string | string[] | undefined): Promise<AuthenticatedUserPayload>;
    validateToken(token: string): Promise<AuthenticatedUserPayload>;
    createSession(user: User, device?: SessionDeviceInput): Promise<{
        userId: number;
        accessToken: string;
        access_token: string;
        refreshToken: string;
        accessTokenExpiresIn: number;
        sessionId: string;
        installationId: string;
    }>;
    refresh(refreshToken: string): Promise<{
        userId: number;
        accessToken: string;
        access_token: string;
        refreshToken: string;
        accessTokenExpiresIn: number;
        sessionId: string;
        installationId: string;
    }>;
    revokeSession(sessionId: string | undefined, reason?: string): Promise<void>;
    revokeAllForUser(userId: number, reason?: string): Promise<void>;
    listActiveForUser(userId: number): Promise<AuthSession[]>;
    private tokenResult;
    private assertUserCanAuthenticate;
    private legacyTokenAllowed;
    private refreshInvalid;
    private hashRefreshToken;
    private safeEqual;
    private jwtSecret;
}
