import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthSessionService } from 'src/auth/auth-session.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { ModerationService } from 'src/moderation/moderation.service';

describe('ProfilesController', () => {
  let app: INestApplication;
  const profilesService = {
    searchProfiles: jest.fn(),
    getProfile: jest.fn(),
    follow: jest.fn(),
    unfollow: jest.fn(),
  };
  const authSessionService = {
    validateAuthorizationHeader: jest.fn(async (header?: string) => {
      if (header !== 'Bearer valid-token') {
        throw new UnauthorizedException('Unauthorized');
      }
      return { id: 7 };
    }),
  };
  const moderationService = {
    listBlocked: jest.fn(),
    block: jest.fn(),
    unblock: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    profilesService.searchProfiles.mockResolvedValue({
      data: [],
      total: 0,
      totalPages: 0,
      currentPage: 1,
    });
    profilesService.getProfile.mockResolvedValue({
      profile: { type: 'user', id: '7' },
      viewerState: { following: false, isSelf: true, canManage: true },
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [ProfilesController],
      providers: [
        JwtAuthGuard,
        { provide: ProfilesService, useValue: profilesService },
        { provide: AuthSessionService, useValue: authSessionService },
        { provide: ModerationService, useValue: moderationService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('resolves the authenticated static search route with normalized defaults', async () => {
    await request(app.getHttpServer())
      .get('/profiles/search?profileType=user&q=%20Aarav%20')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(profilesService.searchProfiles).toHaveBeenCalledWith(
      {
        profileType: 'user',
        q: 'Aarav',
        page: 1,
        limit: 20,
      },
      7,
    );
    expect(profilesService.getProfile).not.toHaveBeenCalled();
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .get('/profiles/search?profileType=user&q=Aarav')
      .expect(401);
  });

  it.each([
    '/profiles/search?q=Aarav',
    '/profiles/search?profileType=all&q=Aarav',
    '/profiles/search?profileType=user',
    '/profiles/search?profileType=user&q=A',
    `/profiles/search?profileType=user&q=${'a'.repeat(81)}`,
    '/profiles/search?profileType=user&q=Aarav&page=0',
    '/profiles/search?profileType=user&q=Aarav&limit=31',
  ])('returns 400 for invalid search query %s', async (url) => {
    await request(app.getHttpServer())
      .get(url)
      .set('Authorization', 'Bearer valid-token')
      .expect(400);
  });

  it('accepts the maximum limit', async () => {
    await request(app.getHttpServer())
      .get('/profiles/search?profileType=company&q=build&limit=30&page=2')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(profilesService.searchProfiles).toHaveBeenCalledWith(
      {
        profileType: 'company',
        q: 'build',
        page: 2,
        limit: 30,
      },
      7,
    );
  });

  it('keeps the existing profile detail route functional', async () => {
    await request(app.getHttpServer())
      .get('/profiles/user/7')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(profilesService.getProfile).toHaveBeenCalledWith('user', 7, 7);
  });
});
