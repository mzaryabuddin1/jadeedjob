import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthSessionService } from 'src/auth/auth-session.service';
import { OptionalJwtAuthGuard } from 'src/auth/optional-jwt-auth.guard';
import { PublicPostsController } from './public-posts.controller';
import { PostsService } from './posts.service';

describe('PublicPostsController', () => {
  let app: INestApplication;
  const postsService = {
    getFeed: jest.fn(),
    getPost: jest.fn(),
    getComments: jest.fn(),
  };
  const authSessionService = {
    validateAuthorizationHeader: jest.fn(async (header: string) => {
      if (header !== 'Bearer valid-token') throw new UnauthorizedException();
      return { id: 7 };
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    postsService.getFeed.mockResolvedValue({ data: [], nextCursor: null });
    postsService.getPost.mockResolvedValue({
      id: '4',
      body: 'Public',
      stats: {},
    });
    postsService.getComments.mockResolvedValue({ data: [], nextCursor: null });
    const moduleRef = await Test.createTestingModule({
      controllers: [PublicPostsController],
      providers: [
        OptionalJwtAuthGuard,
        { provide: PostsService, useValue: postsService },
        { provide: AuthSessionService, useValue: authSessionService },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => app?.close());

  it('supports anonymous reads and uses an authenticated viewer when present', async () => {
    await request(app.getHttpServer())
      .get('/public/posts?limit=20')
      .expect(200);
    expect(postsService.getFeed).toHaveBeenLastCalledWith(
      { limit: 20, feed: 'forYou' },
      0,
    );

    await request(app.getHttpServer())
      .get('/public/posts?limit=20')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);
    expect(postsService.getFeed).toHaveBeenLastCalledWith(
      { limit: 20, feed: 'forYou' },
      7,
    );
  });

  it('rejects invalid paired filters and exposes no mutation route', async () => {
    await request(app.getHttpServer())
      .get('/public/posts?publisherType=company')
      .expect(400);
    await request(app.getHttpServer()).post('/public/posts').expect(404);
  });
});
