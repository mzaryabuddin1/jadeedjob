import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReelsService } from './reels.service';

const createQueryBuilderMock = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue([]),
});

const createRepo = (overrides: Record<string, any> = {}) => ({
  create: jest.fn((value) => value),
  save: jest.fn(async (value) => value),
  findOne: jest.fn(),
  find: jest.fn(async () => []),
  delete: jest.fn(),
  increment: jest.fn(),
  createQueryBuilder: jest.fn(createQueryBuilderMock),
  ...overrides,
});

const createService = (overrides: Record<string, any> = {}) => {
  const repos = {
    reelRepo: createRepo(),
    uploadSessionRepo: createRepo(),
    likeRepo: createRepo(),
    saveRepo: createRepo(),
    commentRepo: createRepo(),
    profileFollowRepo: createRepo(),
    jobRepo: createRepo(),
    userRepo: createRepo(),
    pagesService: {
      getReelPublisherOptions: jest.fn(),
      assertCompanyCanPublish: jest.fn(),
    },
    profilesService: {
      follow: jest.fn(),
      unfollow: jest.fn(),
    },
    storage: {
      createUploadKey: jest.fn(() => 'reels/1/video.mp4'),
      getUploadInstructions: jest.fn(() => ({
        uploadId: 'upload-id',
        method: 'POST',
        url: 'http://localhost:3000/reels/1/upload',
        fields: { uploadId: 'upload-id' },
        headers: {},
        fileField: 'video',
        expiresAt: new Date(),
      })),
      deleteLocalFile: jest.fn(),
      commitUpload: jest.fn(),
      remove: jest.fn(),
    },
    moderationService: {
      assertInteractionAllowed: jest.fn(),
      blockedTargets: jest.fn(async () => ({ userIds: [], companyIds: [] })),
    },
    objectStorageService: {
      getUrl: jest.fn(async () => null),
    },
    idempotencyService: {
      execute: jest.fn(
        async (_userId, _scope, _key, _request, operation) => operation(),
      ),
    },
    notificationsService: {
      create: jest.fn(async () => ({})),
    },
    ...overrides,
  };

  const service = new ReelsService(
    repos.reelRepo as any,
    repos.uploadSessionRepo as any,
    repos.likeRepo as any,
    repos.saveRepo as any,
    repos.commentRepo as any,
    repos.profileFollowRepo as any,
    repos.jobRepo as any,
    repos.userRepo as any,
    repos.pagesService as any,
    repos.profilesService as any,
    repos.storage as any,
    repos.moderationService as any,
    repos.objectStorageService as any,
    repos.idempotencyService as any,
    repos.notificationsService as any,
  );

  return { service, repos };
};

const validCreatePayload = {
  caption: 'A short work reel',
  category: 'community' as const,
  visibility: 'public' as const,
  allowComments: true,
  allowSharing: true,
  media: {
    fileName: 'work.mp4',
    contentType: 'video/mp4',
    fileSizeBytes: 1024,
    durationSeconds: 30,
  },
};

describe('ReelsService', () => {
  it('defaults to publishing as the authenticated user', async () => {
    const creator = { id: 7, firstName: 'Test', lastName: 'User' };
    const reelRepo = createRepo({
      save: jest.fn(async (value) => ({ id: 1, ...value })),
      findOne: jest.fn(async () => ({
        id: 1,
        creatorId: 7,
        creator,
        publisherType: 'user',
        publisherCompanyId: null,
        status: 'upload_pending',
        ...validCreatePayload,
      })),
    });
    const { service, repos } = createService({ reelRepo });

    await service.createReel(validCreatePayload, 7);

    expect(repos.reelRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        creatorId: 7,
        publisherType: 'user',
        publisherCompanyId: null,
      }),
    );
    expect(repos.pagesService.assertCompanyCanPublish).not.toHaveBeenCalled();
  });

  it('allows an approved company publisher after access validation', async () => {
    const company = {
      id: 12,
      company_name: 'Approved Co',
      username: 'approved-co',
      verificationStatus: 'approved',
    };
    const reelRepo = createRepo({
      save: jest.fn(async (value) => ({ id: 1, ...value })),
      findOne: jest.fn(async () => ({
        id: 1,
        creatorId: 7,
        creator: { id: 7, firstName: 'Test' },
        publisherType: 'company',
        publisherCompanyId: 12,
        publisherCompany: company,
        status: 'upload_pending',
        ...validCreatePayload,
      })),
    });
    const { service, repos } = createService({ reelRepo });

    await service.createReel(
      { ...validCreatePayload, publisher: { type: 'company', id: 12 } },
      7,
    );

    expect(repos.pagesService.assertCompanyCanPublish).toHaveBeenCalledWith(
      12,
      7,
    );
    expect(repos.reelRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        publisherType: 'company',
        publisherCompanyId: 12,
      }),
    );
  });

  it('rejects a company publisher when approval or permission is unavailable', async () => {
    const pagesService = {
      getReelPublisherOptions: jest.fn(),
      assertCompanyCanPublish: jest.fn(async () => {
        throw new ForbiddenException('Company publishing is unavailable');
      }),
    };
    const { service, repos } = createService({ pagesService });

    await expect(
      service.createReel(
        { ...validCreatePayload, publisher: { type: 'company', id: 12 } },
        7,
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(repos.reelRepo.save).not.toHaveBeenCalled();
  });

  it('blocks completion when company access was revoked after creation', async () => {
    const reel = {
      id: 1,
      creatorId: 7,
      creator: { id: 7, firstName: 'Test' },
      publisherType: 'company',
      publisherCompanyId: 12,
      publisherCompany: {
        id: 12,
        verificationStatus: 'approved',
        company_name: 'Approved Co',
      },
      visibility: 'public',
      status: 'upload_pending',
      linkedJobId: null,
    };
    const reelRepo = createRepo({ findOne: jest.fn(async () => reel) });
    const uploadSessionRepo = createRepo({
      findOne: jest.fn(async () => ({
        reelId: 1,
        userId: 7,
        uploadId: 'upload-id',
        status: 'uploaded',
        publicUrl: '/uploads/reels/video.mp4',
        uploadKey: 'reels/1/video.mp4',
        expiresAt: new Date(Date.now() + 60_000),
      })),
    });
    const pagesService = {
      getReelPublisherOptions: jest.fn(),
      assertCompanyCanPublish: jest.fn(async () => {
        throw new ForbiddenException('Company access is disabled');
      }),
    };
    const { service } = createService({
      reelRepo,
      uploadSessionRepo,
      pagesService,
    });

    await expect(service.completeUpload(1, 7, 'upload-id')).rejects.toThrow(
      ForbiddenException,
    );
    expect(reelRepo.save).not.toHaveBeenCalled();
  });

  it('still lets the uploader delete a company reel after access is revoked', async () => {
    const reel = {
      id: 1,
      creatorId: 7,
      publisherType: 'company',
      publisherCompanyId: 12,
      status: 'draft',
      deletedAt: null,
    };
    const reelRepo = createRepo({ findOne: jest.fn(async () => reel) });
    const { service, repos } = createService({ reelRepo });

    await expect(service.deleteReel(1, 7)).resolves.toEqual({
      id: '1',
      deleted: true,
    });
    expect(repos.pagesService.assertCompanyCanPublish).not.toHaveBeenCalled();
    expect(reelRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'deleted' }),
    );
  });

  it('rejects a linked job owned by a different user publisher', async () => {
    const jobRepo = createRepo({
      findOne: jest.fn(async () => ({
        id: 123,
        createdBy: 99,
        isActive: true,
        status: 'active',
      })),
    });
    const { service, repos } = createService({ jobRepo });

    await expect(
      service.createReel({ ...validCreatePayload, linkedJobId: 123 }, 7),
    ).rejects.toThrow('Linked job was not created by this user');
    expect(repos.reelRepo.save).not.toHaveBeenCalled();
  });

  it('formats legacy user reels and company reels with publisher aliases', () => {
    const { service } = createService();
    const format = (service as any).formatReelSync.bind(service);
    const base = {
      id: 1,
      creatorId: 7,
      creator: { id: 7, firstName: 'Test', lastName: 'User' },
      category: 'community',
      caption: 'Test caption',
      audioTitle: 'Original audio',
      visibility: 'public',
      status: 'published',
    };

    const legacy = format(base, 8, new Set(), new Set(), new Set());
    expect(legacy.publisher.type).toBe('user');
    expect(legacy.author).toEqual(legacy.publisher);

    const company = format(
      {
        ...base,
        publisherType: 'company',
        publisherCompanyId: 12,
        publisherCompany: {
          id: 12,
          company_name: 'Approved Co',
          username: 'approved-co',
          verificationStatus: 'approved',
        },
      },
      8,
      new Set(),
      new Set(),
      new Set(['company:12']),
    );
    expect(company.publisher.type).toBe('company');
    expect(company.viewerState.followingPublisher).toBe(true);
    expect(company.viewerState.followingCreator).toBe(true);
  });

  it('rejects unsupported media content types before creating records', async () => {
    const { service, repos } = createService();

    await expect(
      service.createReel(
        {
          ...validCreatePayload,
          media: {
            ...validCreatePayload.media,
            contentType: 'image/png',
          },
        },
        7,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(repos.reelRepo.save).not.toHaveBeenCalled();
  });

  it('rejects reels longer than the mobile picker limit', async () => {
    const { service, repos } = createService();

    await expect(
      service.createReel(
        {
          ...validCreatePayload,
          media: {
            ...validCreatePayload.media,
            durationSeconds: 61,
          },
        },
        7,
      ),
    ).rejects.toThrow('Reel video must be 60 seconds or shorter');

    expect(repos.reelRepo.save).not.toHaveBeenCalled();
  });

  it('rejects inactive or missing linked jobs', async () => {
    const { service, repos } = createService({
      jobRepo: createRepo({
        findOne: jest.fn(async () => null),
      }),
    });

    await expect(
      service.createReel(
        {
          ...validCreatePayload,
          linkedJobId: 123,
        },
        7,
      ),
    ).rejects.toThrow('Linked job does not exist or is not active');

    expect(repos.reelRepo.save).not.toHaveBeenCalled();
  });
});
