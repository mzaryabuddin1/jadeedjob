import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PostsService } from './posts.service';

const queryBuilder = (overrides: Record<string, any> = {}) => ({
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  setParameter: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getMany: jest.fn(async () => []),
  getManyAndCount: jest.fn(async () => [[], 0]),
  getRawAndEntities: jest.fn(async () => ({ entities: [], raw: [] })),
  getOne: jest.fn(),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  orIgnore: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  execute: jest.fn(async () => ({
    raw: { affectedRows: 1 },
    identifiers: [{}],
  })),
  ...overrides,
});

const repo = (overrides: Record<string, any> = {}) => ({
  create: jest.fn((value) => value),
  save: jest.fn(async (value) => value),
  findOne: jest.fn(),
  find: jest.fn(async () => []),
  delete: jest.fn(async () => ({ affected: 0 })),
  increment: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(() => queryBuilder()),
  ...overrides,
});

const basePost = (overrides: Record<string, any> = {}) => ({
  id: 1,
  creatorId: 7,
  creator: {
    id: 7,
    firstName: 'Aarav',
    lastName: 'Sharma',
    isBanned: false,
  },
  publisherType: 'user',
  publisherCompanyId: null,
  publisherCompany: null,
  body: 'Community update',
  imageUrl: null,
  imageStorageKey: null,
  mediaType: 'none',
  mediaStatus: 'published',
  videoUrl: null,
  videoStorageKey: null,
  videoThumbnailUrl: null,
  videoThumbnailStorageKey: null,
  videoContentType: null,
  videoFileSizeBytes: null,
  videoDurationSeconds: null,
  linkedJobId: null,
  linkedJob: null,
  allowComments: true,
  likesCount: 0,
  commentsCount: 0,
  savesCount: 0,
  sharesCount: 0,
  deletedAt: null,
  createdAt: new Date('2026-07-21T10:00:00.000Z'),
  updatedAt: new Date('2026-07-21T10:00:00.000Z'),
  ...overrides,
});

const createService = (overrides: Record<string, any> = {}) => {
  const deps = {
    postRepo: repo(),
    likeRepo: repo(),
    saveRepo: repo(),
    commentRepo: repo(),
    reportRepo: repo(),
    followRepo: repo(),
    jobRepo: repo(),
    userRepo: repo(),
    videoUploadRepo: repo(),
    pagesService: {
      assertCompanyCanPublish: jest.fn(async () => ({
        member: { role: 'owner', permissions: { publishContent: true } },
      })),
    },
    storage: {
      save: jest.fn(),
      remove: jest.fn(),
    },
    videoStorage: {
      createUploadKey: jest.fn(() => 'community-post-videos/new.mp4'),
      getUploadInstructions: jest.fn(() => ({ uploadId: 'upload-id' })),
      commitUpload: jest.fn(),
      inspectVideo: jest.fn(),
      createThumbnail: jest.fn(),
      deleteLocalFile: jest.fn(),
      remove: jest.fn(),
    },
    moderationService: {
      blockedTargets: jest.fn(async () => ({ userIds: [], companyIds: [] })),
    },
    objectStorageService: {
      getUrl: jest.fn(async () => null),
    },
    ...overrides,
  };

  return {
    service: new PostsService(
      deps.postRepo as any,
      deps.likeRepo as any,
      deps.saveRepo as any,
      deps.commentRepo as any,
      deps.reportRepo as any,
      deps.followRepo as any,
      deps.jobRepo as any,
      deps.userRepo as any,
      deps.videoUploadRepo as any,
      deps.pagesService as any,
      deps.storage as any,
      deps.videoStorage as any,
      deps.moderationService as any,
      deps.objectStorageService as any,
    ),
    deps,
  };
};

describe('PostsService', () => {
  it('creates a personal post and rejects an empty post', async () => {
    let stored = basePost();
    const postRepo = repo({
      save: jest.fn(async (value) => {
        stored = basePost({ ...stored, ...value, id: 1 });
        return stored;
      }),
      findOne: jest.fn(async () => stored),
    });
    const userRepo = repo({
      findOne: jest.fn(async () => ({ id: 7, isBanned: false })),
    });
    const { service } = createService({ postRepo, userRepo });

    await expect(
      service.createPost(
        { publisherType: 'user', body: '  Community update  ' },
        undefined,
        7,
      ),
    ).resolves.toMatchObject({
      id: '1',
      body: 'Community update',
      publisher: { type: 'user', id: '7' },
    });
    await expect(
      service.createPost({ body: '   ' }, undefined, 7),
    ).rejects.toThrow('Add text or an image to publish');
  });

  it('enforces company approval and publishing access on creation', async () => {
    const pagesService = {
      assertCompanyCanPublish: jest.fn(async () => {
        throw new ForbiddenException('Company publishing is unavailable');
      }),
    };
    const { service, deps } = createService({ pagesService });

    await expect(
      service.createPost(
        { publisherType: 'company', publisherId: 12, body: 'Company update' },
        undefined,
        7,
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(deps.postRepo.save).not.toHaveBeenCalled();
  });

  it('accepts long video metadata but enforces type and 100 MB size', () => {
    const { service } = createService();
    expect(() =>
      (service as any).validateVideoMetadata({
        fileName: 'training.mp4',
        contentType: 'video/mp4',
        fileSizeBytes: 1024,
        durationSeconds: 7200,
      }),
    ).not.toThrow();
    expect(() =>
      (service as any).validateVideoMetadata({
        fileName: 'training.avi',
        contentType: 'video/x-msvideo',
      }),
    ).toThrow('Use an MP4, MOV, or M4V video');
    expect(() =>
      (service as any).validateVideoMetadata({
        fileName: 'training.mp4',
        contentType: 'video/mp4',
        fileSizeBytes: 100 * 1024 * 1024 + 1,
      }),
    ).toThrow('Video must be 100 MB or smaller');
  });

  it('excludes incomplete media from every public feed query', async () => {
    const qb = queryBuilder();
    const postRepo = repo({ createQueryBuilder: jest.fn(() => qb) });
    const { service } = createService({ postRepo });

    await service.getFeed({}, 7);
    expect(qb.andWhere).toHaveBeenCalledWith(
      'post.mediaStatus = :publishedMediaStatus',
      { publishedMediaStatus: 'published' },
    );
  });

  it('searches only viewable posts with escaped terms and stable pagination', async () => {
    const post = basePost({ body: 'Safe tools at work' });
    const qb = queryBuilder({
      getManyAndCount: jest.fn(async () => [[post], 1]),
    });
    const postRepo = repo({ createQueryBuilder: jest.fn(() => qb) });
    const { service } = createService({ postRepo });

    const response = await service.searchPosts(
      { q: '  safe%_!  ', page: 2, limit: 10 },
      7,
    );

    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('post.body'),
      expect.objectContaining({
        exactQuery: 'safe%_!',
        prefixQuery: 'safe!%!_!!%',
        containsQuery: '%safe!%!_!!%',
      }),
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      'post.mediaStatus = :publishedMediaStatus',
      { publishedMediaStatus: 'published' },
    );
    expect(qb.skip).toHaveBeenCalledWith(10);
    expect(qb.take).toHaveBeenCalledWith(10);
    expect(qb.orderBy).toHaveBeenCalledWith('searchRank', 'ASC');
    expect(response).toMatchObject({
      total: 1,
      totalPages: 1,
      currentPage: 2,
      data: [{ id: '1', body: 'Safe tools at work' }],
    });
  });

  it('uses the same current company access rules for mutations', async () => {
    const companyPost = basePost({
      publisherType: 'company',
      publisherCompanyId: 12,
    });
    const { service, deps } = createService();

    await expect(
      (service as any).assertCanManage(companyPost, 7),
    ).resolves.toBeUndefined();

    deps.pagesService.assertCompanyCanPublish.mockResolvedValueOnce({
      member: { role: 'editor', permissions: { publishContent: true } },
    });
    await expect(
      (service as any).assertCanManage(companyPost, 8),
    ).rejects.toThrow('You cannot manage this post');

    deps.pagesService.assertCompanyCanPublish.mockResolvedValueOnce({
      member: { role: 'admin', permissions: { publishContent: true } },
    });
    await expect(
      (service as any).assertCanManage(companyPost, 9),
    ).resolves.toBeUndefined();

    deps.pagesService.assertCompanyCanPublish.mockRejectedValueOnce(
      new ForbiddenException('Company access is disabled'),
    );
    await expect(
      (service as any).assertCanManage(companyPost, 7),
    ).rejects.toThrow('Company access is disabled');
  });

  it('requires linked jobs to be active, public, and company-owned when applicable', async () => {
    const individualJob = {
      id: 4,
      isActive: true,
      status: 'active',
      postingMode: 'individual',
      pageId: null,
      creator: { isBanned: false },
    };
    const jobRepo = repo({ findOne: jest.fn(async () => individualJob) });
    const { service } = createService({ jobRepo });

    await expect(
      (service as any).validateLinkedJob(4, 'user', null),
    ).resolves.toBe(individualJob);

    individualJob.creator.isBanned = true;
    await expect(
      (service as any).validateLinkedJob(4, 'user', null),
    ).rejects.toThrow('Linked job is not publicly available');

    jobRepo.findOne.mockResolvedValue({
      ...individualJob,
      creator: { isBanned: false },
      postingMode: 'company',
      pageId: 12,
      page: { verificationStatus: 'approved' },
    });
    await expect(
      (service as any).validateLinkedJob(4, 'company', 13),
    ).rejects.toThrow('Company posts can only link jobs from that company');
  });

  it('omits a linked-job summary after the job becomes unavailable', () => {
    const { service } = createService();
    const post = basePost({
      linkedJob: {
        id: 4,
        title: 'Closed job',
        isActive: false,
        status: 'closed',
      },
    });

    expect((service as any).formatPostBase(post)).not.toHaveProperty(
      'linkedJob',
    );
  });

  it('keeps repeated likes idempotent and rejects duplicate reports', async () => {
    const insertBuilder = queryBuilder({
      execute: jest.fn(async () => ({
        raw: { affectedRows: 0 },
        identifiers: [{}],
      })),
    });
    const likeRepo = repo({ createQueryBuilder: jest.fn(() => insertBuilder) });
    const reportRepo = repo({ findOne: jest.fn(async () => ({ id: 3 })) });
    const { service, deps } = createService({ likeRepo, reportRepo });
    jest
      .spyOn(service as any, 'getViewablePostOrThrow')
      .mockResolvedValue(basePost());
    jest.spyOn(service, 'getPost').mockResolvedValue({ id: '1' } as any);

    await service.like(1, 7);
    expect(deps.postRepo.increment).not.toHaveBeenCalled();
    await expect(service.report(1, 8, 'spam')).rejects.toThrow(
      'Post already reported',
    );
  });

  it('keeps disabled comments readable but rejects new comments', async () => {
    const { service } = createService();
    jest
      .spyOn(service as any, 'getViewablePostOrThrow')
      .mockResolvedValue(basePost({ allowComments: false }));

    await expect(service.addComment(1, 7, 'Hello')).rejects.toThrow(
      'Comments are disabled for this post',
    );
  });

  it('removes replaced image files after a successful update', async () => {
    const post = basePost({
      imageUrl: '/old.jpg',
      imageStorageKey: 'community-posts/old.jpg',
    });
    const storage = {
      save: jest.fn(async () => ({
        publicUrl: '/new.jpg',
        storageKey: 'community-posts/new.jpg',
      })),
      remove: jest.fn(),
    };
    const { service } = createService({ storage });
    jest.spyOn(service as any, 'getPostByIdOrThrow').mockResolvedValue(post);
    jest.spyOn(service as any, 'assertCanManage').mockResolvedValue(undefined);

    await service.updatePost(
      1,
      {},
      { originalname: 'new.jpg' } as Express.Multer.File,
      7,
    );

    expect(storage.remove).toHaveBeenCalledWith('community-posts/old.jpg');
  });

  it('preserves ranked and profile feed ordering and rejects cursor mode reuse', async () => {
    const mixedQb = queryBuilder();
    const postRepo = repo({ createQueryBuilder: jest.fn(() => mixedQb) });
    const { service } = createService({ postRepo });

    await service.getFeed({}, 7);
    expect(mixedQb.addSelect).toHaveBeenCalledWith(
      expect.stringContaining('86400'),
      'feedScore',
    );
    expect(mixedQb.orderBy).toHaveBeenCalledWith('feedScore', 'DESC');
    expect(mixedQb.addOrderBy).toHaveBeenCalledWith('post.id', 'DESC');

    const profileCursor = (service as any).encodeCursor({
      mode: 'profile',
      createdAt: '2026-07-21T10:00:00.000Z',
      id: 1,
    });
    await expect(service.getFeed({ cursor: profileCursor }, 7)).rejects.toThrow(
      'Post cursor does not match this feed',
    );

    const feedCursor = (service as any).encodeCursor({
      mode: 'feed',
      score: 100,
      id: 1,
    });
    await expect(
      service.getFeed(
        { publisherType: 'user', publisherId: 7, cursor: feedCursor },
        7,
      ),
    ).rejects.toThrow('Post cursor does not match this feed');
  });

  it('rejects malformed cursor values', () => {
    const { service } = createService();
    const invalid = Buffer.from(
      JSON.stringify({ mode: 'feed', score: 10, id: 0 }),
    ).toString('base64url');

    expect(() => (service as any).decodeCursor(invalid)).toThrow(
      BadRequestException,
    );
  });
});
