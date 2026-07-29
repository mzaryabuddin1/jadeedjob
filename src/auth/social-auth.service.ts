import {
  BadGatewayException,
  ConflictException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OAuth2Client } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { ApiException } from 'src/common/errors/api-exception';
import { User } from 'src/users/entities/user.entity';
import { AuthIdentity } from './entities/auth-identity.entity';
import { AuthService } from './auth.service';
import { AuthSocialChallenge } from './entities/auth-social-challenge.entity';

type ProviderProfile = {
  provider: 'google' | 'facebook';
  subject: string;
  firstName: string;
  lastName: string;
  email?: string;
  picture?: string;
};

@Injectable()
export class SocialAuthService {
  private readonly googleClient = new OAuth2Client();

  constructor(
    @InjectRepository(AuthIdentity)
    private readonly identityRepo: Repository<AuthIdentity>,
    @InjectRepository(AuthSocialChallenge)
    private readonly challengeRepo: Repository<AuthSocialChallenge>,
    private readonly authService: AuthService,
  ) {}

  async verifyGoogle(idToken: string) {
    try {
      const audiences = (process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      if (!audiences.length) throw new Error('Google client ID is not configured');
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: audiences,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub) throw new Error('Google token has no subject');
      const names = this.splitName(payload.name || payload.given_name || 'JobsLoot User');
      return {
        provider: 'google',
        subject: payload.sub,
        firstName: payload.given_name || names.firstName,
        lastName: payload.family_name || names.lastName,
        email: payload.email_verified ? payload.email : undefined,
        picture: payload.picture,
      } satisfies ProviderProfile;
    } catch (error) {
      if ((error as Error).message.includes('configured')) {
        throw new BadGatewayException({
          code: 'AUTH_SOCIAL_PROVIDER_UNAVAILABLE',
          message: 'Google authentication is not configured',
        });
      }
      throw new UnauthorizedException({
        code: 'AUTH_SOCIAL_TOKEN_INVALID',
        message: 'Invalid Google identity token',
      });
    }
  }

  async verifyFacebook(accessToken: string) {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    if (!appId || !appSecret) {
      throw new BadGatewayException({
        code: 'AUTH_SOCIAL_PROVIDER_UNAVAILABLE',
        message: 'Facebook authentication is not configured',
      });
    }
    try {
      const appToken = `${appId}|${appSecret}`;
      const debugUrl = new URL('https://graph.facebook.com/debug_token');
      debugUrl.searchParams.set('input_token', accessToken);
      debugUrl.searchParams.set('access_token', appToken);
      const debugResponse = await fetch(debugUrl);
      const debug = await debugResponse.json();
      if (
        !debugResponse.ok ||
        !debug?.data?.is_valid ||
        String(debug.data.app_id) !== String(appId) ||
        !debug.data.user_id
      ) {
        throw new Error('Invalid token');
      }

      const profileUrl = new URL(`https://graph.facebook.com/${debug.data.user_id}`);
      profileUrl.searchParams.set('fields', 'id,first_name,last_name,name,email,picture');
      profileUrl.searchParams.set('access_token', accessToken);
      const profileResponse = await fetch(profileUrl);
      const profile = await profileResponse.json();
      if (!profileResponse.ok || !profile?.id) throw new Error('Invalid profile');
      const names = this.splitName(profile.name || 'JobsLoot User');
      return {
        provider: 'facebook',
        subject: String(profile.id),
        firstName: profile.first_name || names.firstName,
        lastName: profile.last_name || names.lastName,
        email: profile.email,
        picture: profile.picture?.data?.url,
      } satisfies ProviderProfile;
    } catch (error) {
      throw new UnauthorizedException({
        code: 'AUTH_SOCIAL_TOKEN_INVALID',
        message: 'Invalid Facebook access token',
      });
    }
  }

  async findLinkedUser(profile: ProviderProfile) {
    const identity = await this.identityRepo.findOne({
      where: { provider: profile.provider, subject: profile.subject },
      relations: ['user'],
    });
    return identity?.user || null;
  }

  async createPhoneChallenge(profile: ProviderProfile) {
    const challengeId = randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.challengeRepo.save(
      this.challengeRepo.create({
        id: challengeId,
        provider: profile.provider,
        subject: profile.subject,
        expiresAt,
      }),
    );
    const token = jwt.sign(
      {
        type: 'social_phone_challenge',
        ...profile,
      },
      this.challengeSecret(),
      { expiresIn: 10 * 60, jwtid: challengeId },
    );
    return {
      code: 'AUTH_SOCIAL_PHONE_REQUIRED',
      message: 'Phone verification is required to finish social sign-in',
      socialVerificationToken: token,
      expiresIn: 600,
      profilePreview: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        picture: profile.picture || null,
      },
    };
  }

  async verifyPhoneChallenge(
    token: string,
  ): Promise<ProviderProfile & { jti: string }> {
    try {
      const decoded = jwt.verify(token, this.challengeSecret());
      if (
        typeof decoded === 'string' ||
        decoded.type !== 'social_phone_challenge' ||
        !['google', 'facebook'].includes(decoded.provider) ||
        !decoded.subject ||
        !decoded.jti
      ) {
        throw new Error('Invalid challenge');
      }
      const record = await this.challengeRepo.findOne({
        where: { id: String(decoded.jti) },
      });
      if (
        !record ||
        record.usedAt ||
        record.expiresAt <= new Date() ||
        record.provider !== decoded.provider ||
        record.subject !== decoded.subject
      ) {
        throw new Error('Challenge is no longer available');
      }
      return decoded as ProviderProfile & { jti: string };
    } catch {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        'AUTH_SOCIAL_CHALLENGE_INVALID',
        'Social verification challenge is invalid or expired',
      );
    }
  }

  async consumePhoneChallenge(token: string) {
    const profile = await this.verifyPhoneChallenge(token);
    return this.challengeRepo.manager.transaction(async (manager) => {
      const record = await manager.getRepository(AuthSocialChallenge).findOne({
        where: { id: profile.jti },
        lock: { mode: 'pessimistic_write' },
      });
      if (!record || record.usedAt || record.expiresAt <= new Date()) {
        throw new ApiException(
          HttpStatus.UNAUTHORIZED,
          'AUTH_SOCIAL_CHALLENGE_INVALID',
          'Social verification challenge is invalid or expired',
        );
      }
      record.usedAt = new Date();
      await manager.save(record);
      return profile;
    });
  }

  async linkVerifiedPhone(
    profile: ProviderProfile,
    phone: string,
  ): Promise<User> {
    const existingIdentity = await this.identityRepo.findOne({
      where: { provider: profile.provider, subject: profile.subject },
      relations: ['user'],
    });
    if (existingIdentity) return existingIdentity.user;

    let user = await this.authService.findUserByPhone(phone);
    if (!user) {
      user = await this.authService.createSocialUser({
        phone,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        profilePhoto: profile.picture,
      });
    }

    const sameProvider = await this.identityRepo.findOne({
      where: { userId: user.id, provider: profile.provider },
    });
    if (sameProvider && sameProvider.subject !== profile.subject) {
      throw new ConflictException({
        code: 'AUTH_SOCIAL_IDENTITY_CONFLICT',
        message: 'This account is already linked to another provider identity',
      });
    }

    try {
      await this.identityRepo.save(
        this.identityRepo.create({
          userId: user.id,
          provider: profile.provider,
          subject: profile.subject,
          providerEmail: profile.email || null,
          providerMetadata: { picture: profile.picture || null },
        }),
      );
    } catch {
      const raced = await this.identityRepo.findOne({
        where: { provider: profile.provider, subject: profile.subject },
        relations: ['user'],
      });
      if (!raced) throw new ConflictException('Unable to link social identity');
      user = raced.user;
    }
    return user;
  }

  private challengeSecret() {
    const secret =
      process.env.SOCIAL_CHALLENGE_SECRET || process.env.JWT_SECRET;
    if (!secret) throw new Error('SOCIAL_CHALLENGE_SECRET is required');
    return secret;
  }

  private splitName(value: string) {
    const parts = value.trim().split(/\s+/);
    return {
      firstName: parts.shift() || 'JobsLoot',
      lastName: parts.join(' ') || 'User',
    };
  }
}
