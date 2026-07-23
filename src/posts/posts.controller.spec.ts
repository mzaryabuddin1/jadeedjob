import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthSessionService } from 'src/auth/auth-session.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

describe('PostsController', () => {
  let app: INestApplication;
  const response = { id: '1' };
  const postsService: Record<string, jest.Mock> = {
    getFeed: jest.fn(),
    getPost: jest.fn(),
    createPost: jest.fn(),
    createVideoUpload: jest.fn(),
    createVideoReplacement: jest.fn(),
    uploadVideo: jest.fn(),
    completeVideoUpload: jest.fn(),
    updatePost: jest.fn(),
    deletePost: jest.fn(),
    like: jest.fn(),
    unlike: jest.fn(),
    save: jest.fn(),
    unsave: jest.fn(),
    share: jest.fn(),
    getComments: jest.fn(),
    addComment: jest.fn(),
    report: jest.fn(),
  };
  const authSessionService = {
    validateAuthorizationHeader: jest.fn(async (header?: string) => {
      if (header !== 'Bearer valid-token') {
        throw new UnauthorizedException('Unauthorized');
      }
      return { id: 7 };
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    Object.values(postsService).forEach((mock) =>
      mock.mockResolvedValue(response),
    );
    postsService.getFeed.mockResolvedValue({ data: [], nextCursor: null });
    postsService.getComments.mockResolvedValue({ data: [], nextCursor: null });

    const moduleRef = await Test.createTestingModule({
      controllers: [PostsController],
      providers: [
        JwtAuthGuard,
        { provide: PostsService, useValue: postsService },
        { provide: AuthSessionService, useValue: authSessionService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('requires authentication and validates paired publisher filters', async () => {
    await request(app.getHttpServer()).get('/posts').expect(401);
    await request(app.getHttpServer())
      .get('/posts?publisherType=company')
      .set('Authorization', 'Bearer valid-token')
      .expect(400);
    await request(app.getHttpServer())
      .get('/posts?publisherType=company&publisherId=12&limit=30')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(postsService.getFeed).toHaveBeenCalledWith(
      { publisherType: 'company', publisherId: 12, limit: 30 },
      7,
    );
  });

  it('keeps multipart create fields and the uploaded image separate', async () => {
    await request(app.getHttpServer())
      .post('/posts')
      .set('Authorization', 'Bearer valid-token')
      .field('publisherType', 'user')
      .field('body', '  Community update  ')
      .field('allowComments', 'false')
      .attach('image', Buffer.from('image-data'), {
        filename: 'photo.png',
        contentType: 'image/png',
      })
      .expect(201);

    expect(postsService.createPost).toHaveBeenCalledWith(
      expect.objectContaining({
        publisherType: 'user',
        body: 'Community update',
        allowComments: false,
      }),
      expect.objectContaining({
        fieldname: 'image',
        originalname: 'photo.png',
      }),
      7,
    );
  });

  it('supports multipart updates and clearing a linked job', async () => {
    await request(app.getHttpServer())
      .patch('/posts/1')
      .set('Authorization', 'Bearer valid-token')
      .field('body', 'Updated post')
      .field('linkedJobId', '')
      .field('removeImage', 'true')
      .expect(200);

    expect(postsService.updatePost).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        body: 'Updated post',
        linkedJobId: '',
        removeImage: true,
      }),
      undefined,
      7,
    );
  });

  it('creates and completes a video upload session without a duration cap', async () => {
    await request(app.getHttpServer())
      .post('/posts/video-uploads')
      .set('Authorization', 'Bearer valid-token')
      .send({
        publisherType: 'user',
        body: 'Training update',
        allowComments: true,
        media: {
          fileName: 'training.mp4',
          contentType: 'video/mp4',
          fileSizeBytes: 1024,
          durationSeconds: 7200,
        },
      })
      .expect(201);

    expect(postsService.createVideoUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'Training update',
        media: expect.objectContaining({durationSeconds: 7200}),
      }),
      7,
    );

    const uploadId = '550e8400-e29b-41d4-a716-446655440000';
    await request(app.getHttpServer())
      .post('/posts/1/complete-video-upload')
      .set('Authorization', 'Bearer valid-token')
      .send({uploadId})
      .expect(201);
    expect(postsService.completeVideoUpload).toHaveBeenCalledWith(
      1,
      7,
      uploadId,
    );
  });

  it('forwards video metadata and rejects oversized requests', async () => {
    await request(app.getHttpServer())
      .post('/posts/video-uploads')
      .set('Authorization', 'Bearer valid-token')
      .send({
        body: 'Video',
        media: {
          fileName: 'video.avi',
          contentType: 'video/x-msvideo',
          fileSizeBytes: 1024,
        },
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/posts/video-uploads')
      .set('Authorization', 'Bearer valid-token')
      .send({
        body: 'Video',
        media: {
          fileName: 'video.mp4',
          contentType: 'video/mp4',
          fileSizeBytes: 100 * 1024 * 1024 + 1,
        },
      })
      .expect(400);
  });

  it('validates comment bodies and comment pagination', async () => {
    await request(app.getHttpServer())
      .post('/posts/1/comments')
      .set('Authorization', 'Bearer valid-token')
      .send({ text: '  Useful update  ' })
      .expect(201);
    await request(app.getHttpServer())
      .get('/posts/1/comments?limit=51')
      .set('Authorization', 'Bearer valid-token')
      .expect(400);

    expect(postsService.addComment).toHaveBeenCalledWith(1, 7, 'Useful update');
  });

  it('requires a valid report reason', async () => {
    await request(app.getHttpServer())
      .post('/posts/1/report')
      .set('Authorization', 'Bearer valid-token')
      .send({ details: 'Missing reason' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/posts/1/report')
      .set('Authorization', 'Bearer valid-token')
      .send({ reason: 'spam', details: 'Repeated advertising' })
      .expect(201);

    expect(postsService.report).toHaveBeenCalledWith(
      1,
      7,
      'spam',
      'Repeated advertising',
    );
  });
});
