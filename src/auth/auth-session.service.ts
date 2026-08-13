import { HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { IsNull, Repository } from 'typeorm';
import { ApiException } from 'src/common/errors/api-exception';
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

@Injectable()
export class AuthSessionService {
  private readonly accessTokenExpiresIn = 15 * 60;
  private readonly refreshTokenLifetimeMs = 30 * 24 * 60 * 60 * 1000;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AuthSession)
    private readonly sessionRepo: Repository<AuthSession>,
  ) {}

  getBearerToken(authHeader: string | string[] | undefined): string {
    const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or invalid Authorization header',
      );
    }
    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException(
        'Missing or invalid Authorization header',
      );
    }
    return token;
  }

  async validateAuthorizationHeader(
    authHeader: string | string[] | undefined,
  ): Promise<AuthenticatedUserPayload> {
    return this.validateToken(this.getBearerToken(authHeader));
  }

  async validateToken(token: string): Promise<AuthenticatedUserPayload> {
    let decoded: JwtPayload;
    try {
      const value = jwt.verify(token, this.jwtSecret());
      if (typeof value === 'string') throw new Error('Invalid token');
      decoded = value;
    } catch (error) {
      if ((error as any)?.name === 'TokenExpiredError') {
        throw new ApiException(
          HttpStatus.UNAUTHORIZED,
          'AUTH_ACCESS_EXPIRED',
          'Access token expired',
        );
      }
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        'AUTH_SESSION_INVALID',
        'Invalid or expired token',
      );
    }

    const id = Number(decoded.id ?? decoded.sub);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        'AUTH_SESSION_INVALID',
        'Invalid or expired token',
      );
    }

    const user = await this.userRepo.findOne({
      where: { id },
      select: [
        'id',
        'isBanned',
        'tokenVersion',
        'systemRole',
        'suspendedAt',
        'suspendedUntil',
        'suspensionReason',
        'deletionScheduledAt',
        'deletedAt',
      ],
    });
    this.assertUserCanAuthenticate(user);

    const tokenVersion = Number((decoded as any).tokenVersion ?? 0);
    if (tokenVersion !== Number(user.tokenVersion || 0)) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        'AUTH_SESSION_REVOKED',
        'Invalid user session',
      );
    }

    const sid = String((decoded as any).sid || '');
    if (sid) {
      const session = await this.sessionRepo.findOne({ where: { id: sid } });
      if (
        !session ||
        session.userId !== id ||
        session.revokedAt ||
        session.expiresAt <= new Date()
      ) {
        throw new ApiException(
          HttpStatus.UNAUTHORIZED,
          'AUTH_SESSION_REVOKED',
          'Invalid user session',
        );
      }
    } else if (!this.legacyTokenAllowed(decoded)) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        'AUTH_SESSION_INVALID',
        'Invalid user session',
      );
    }

    return {
      ...decoded,
      id,
      sid: sid || undefined,
      tokenVersion,
      systemRole: user.systemRole || 'user',
    };
  }

  async createSession(user: User, device: SessionDeviceInput = {}) {
    const installationId =
      String(device.installationId || '').trim() || `legacy:${randomUUID()}`;
    const now = new Date();
    await this.sessionRepo.update(
      {
        userId: user.id,
        installationId,
        revokedAt: IsNull(),
      },
      { revokedAt: now, revokedReason: 'replaced_by_login' },
    );

    const sessionId = randomUUID();
    const secret = randomBytes(32).toString('base64url');
    const refreshToken = `${sessionId}.${secret}`;
    const session = await this.sessionRepo.save(
      this.sessionRepo.create({
        id: sessionId,
        userId: user.id,
        installationId,
        refreshTokenHash: this.hashRefreshToken(refreshToken),
        tokenVersion: Number(user.tokenVersion || 0),
        platform: device.platform || 'unknown',
        deviceName: device.deviceName || null,
        appVersion: device.appVersion || null,
        expiresAt: new Date(Date.now() + this.refreshTokenLifetimeMs),
        lastUsedAt: now,
      }),
    );

    return this.tokenResult(user, session, refreshToken);
  }

  async refresh(refreshToken: string) {
    const [sessionId, secret, ...extra] = String(refreshToken || '').split('.');
    if (!sessionId || !secret || extra.length) {
      throw this.refreshInvalid();
    }
    const outcome = await this.sessionRepo.manager.transaction(
      async (manager) => {
        const session = await manager.getRepository(AuthSession).findOne({
          where: { id: sessionId },
          relations: ['user'],
          lock: { mode: 'pessimistic_write' },
        });
        if (!session) throw this.refreshInvalid();
        if (session.revokedAt) {
          throw new ApiException(
            HttpStatus.UNAUTHORIZED,
            'AUTH_SESSION_REVOKED',
            'Refresh session has been revoked',
          );
        }
        if (session.expiresAt <= new Date()) {
          session.revokedAt = new Date();
          session.revokedReason = 'expired';
          await manager.save(session);
          return {
            ok: false as const,
            error: new ApiException(
              HttpStatus.UNAUTHORIZED,
              'AUTH_REFRESH_EXPIRED',
              'Refresh token expired',
            ),
          };
        }

        const suppliedHash = this.hashRefreshToken(refreshToken);
        if (!this.safeEqual(suppliedHash, session.refreshTokenHash)) {
          session.revokedAt = new Date();
          session.revokedReason = 'refresh_reuse_detected';
          await manager.save(session);
          return {
            ok: false as const,
            error: new ApiException(
              HttpStatus.UNAUTHORIZED,
              'AUTH_REFRESH_REUSE_DETECTED',
              'Refresh token reuse detected; this session was revoked',
            ),
          };
        }

        const user = session.user;
        this.assertUserCanAuthenticate(user);
        if (session.tokenVersion !== Number(user.tokenVersion || 0)) {
          session.revokedAt = new Date();
          session.revokedReason = 'token_version_changed';
          await manager.save(session);
          return {
            ok: false as const,
            error: new ApiException(
              HttpStatus.UNAUTHORIZED,
              'AUTH_SESSION_REVOKED',
              'Invalid user session',
            ),
          };
        }

        const nextToken = `${session.id}.${randomBytes(32).toString('base64url')}`;
        session.refreshTokenHash = this.hashRefreshToken(nextToken);
        session.lastUsedAt = new Date();
        await manager.save(session);
        return {
          ok: true as const,
          value: this.tokenResult(user, session, nextToken),
        };
      },
    );
    if (!outcome.ok) throw outcome.error;
    return outcome.value;
  }

  async revokeSession(sessionId: string | undefined, reason = 'logout') {
    if (!sessionId) return;
    await this.sessionRepo.update(
      { id: sessionId, revokedAt: IsNull() },
      { revokedAt: new Date(), revokedReason: reason },
    );
  }

  async revokeAllForUser(userId: number, reason = 'logout_all') {
    await this.sessionRepo.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date(), revokedReason: reason },
    );
  }

  async listActiveForUser(userId: number) {
    return this.sessionRepo.find({
      where: { userId, revokedAt: IsNull() },
      order: { lastUsedAt: 'DESC' },
    });
  }

  private tokenResult(user: User, session: AuthSession, refreshToken: string) {
    const accessToken = jwt.sign(
      {
        id: user.id,
        sub: String(user.id),
        sid: session.id,
        tokenVersion: Number(user.tokenVersion || 0),
        type: 'access',
      },
      this.jwtSecret(),
      { expiresIn: this.accessTokenExpiresIn },
    );
    return {
      userId: user.id,
      accessToken,
      access_token: accessToken,
      refreshToken,
      accessTokenExpiresIn: this.accessTokenExpiresIn,
      sessionId: session.id,
      installationId: session.installationId,
    };
  }

  private assertUserCanAuthenticate(user: User | null) {
    if (!user) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        'AUTH_SESSION_INVALID',
        'Invalid user session',
      );
    }
    if (user.isBanned) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        'AUTH_ACCOUNT_BANNED',
        'Your account is blocked',
      );
    }
    if (
      user.suspendedAt &&
      (!user.suspendedUntil || user.suspendedUntil > new Date())
    ) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        'AUTH_ACCOUNT_SUSPENDED',
        'Your account is temporarily suspended',
        {
          suspendedUntil: user.suspendedUntil || null,
          reason: user.suspensionReason || null,
        },
      );
    }
    if (user.deletedAt) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        'AUTH_ACCOUNT_DELETED',
        'This account is no longer available',
      );
    }
    if (user.deletionScheduledAt) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        'ACCOUNT_PENDING_DELETION',
        'Account deletion is pending; recover the account to continue',
        { scheduledDeletionAt: user.deletionScheduledAt },
      );
    }
  }

  private legacyTokenAllowed(payload: JwtPayload) {
    if (process.env.NODE_ENV !== 'production') {
      return process.env.ALLOW_LEGACY_ACCESS_TOKENS !== 'false';
    }
    const grace = process.env.LEGACY_ACCESS_TOKEN_GRACE_UNTIL;
    if (!grace) return false;
    const cutoff = new Date(grace);
    return !Number.isNaN(cutoff.getTime()) && cutoff > new Date();
  }

  private refreshInvalid() {
    return new ApiException(
      HttpStatus.UNAUTHORIZED,
      'AUTH_REFRESH_INVALID',
      'Invalid refresh token',
    );
  }

  private hashRefreshToken(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private safeEqual(a: string, b: string) {
    const left = Buffer.from(a);
    const right = Buffer.from(b || '');
    return left.length === right.length && timingSafeEqual(left, right);
  }

  private jwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is required');
    return secret;
  }
}
