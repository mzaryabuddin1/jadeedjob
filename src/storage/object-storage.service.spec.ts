import { BadRequestException } from '@nestjs/common';
import { ObjectStorageService } from './object-storage.service';

describe('ObjectStorageService', () => {
  const repository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  } as any;

  it('rejects an extension that disagrees with MIME type and signature', async () => {
    const service = new ObjectStorageService(repository);

    await expect(
      service.store({
        ownerUserId: 1,
        purpose: 'test',
        file: {
          buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
          originalname: 'photo.jpg',
          mimetype: 'image/png',
          size: 8,
          path: '',
        },
        allowedTypes: ['image/png'],
        maxBytes: 1024,
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Uploaded file extension does not match its content',
      ),
    );
  });
});
