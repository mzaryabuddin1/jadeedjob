import { BadRequestException } from '@nestjs/common';
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
    followRepo: createRepo(),
    jobRepo: createRepo(),
    userRepo: createRepo(),
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
      commitLocalUpload: jest.fn(),
    },
    ...overrides,
  };

  const service = new ReelsService(
    repos.reelRepo as any,
    repos.uploadSessionRepo as any,
    repos.likeRepo as any,
    repos.saveRepo as any,
    repos.commentRepo as any,
    repos.followRepo as any,
    repos.jobRepo as any,
    repos.userRepo as any,
    repos.storage as any,
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
