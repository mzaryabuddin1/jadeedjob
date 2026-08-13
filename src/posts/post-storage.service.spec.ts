import {
  isAllowedPostImage,
  isAllowedPostImageMetadata,
  POST_IMAGE_MAX_BYTES,
  PostStorageService,
} from './post-storage.service';

const file = (
  mimetype: string,
  originalname: string,
  buffer: Buffer,
  size = buffer.length,
) => ({ mimetype, originalname, buffer, size }) as Express.Multer.File;

describe('PostStorageService validation', () => {
  const objectStorage = {
    store: jest.fn(async () => ({
      id: 'asset-id',
      storageKey: 'community-posts/image/1/demo.png',
    })),
    getUrl: jest.fn(async () => 'https://example.test/signed-image'),
    remove: jest.fn(),
  } as any;
  const signatures = {
    jpeg: Buffer.from([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    png: Buffer.from('89504e470d0a1a0a00000000', 'hex'),
    webp: Buffer.from('RIFF0000WEBP'),
    heif: Buffer.from('000000006674797068656963', 'hex'),
  };

  it('accepts supported metadata only when MIME and extension agree', () => {
    expect(isAllowedPostImageMetadata('image/jpeg', 'photo.jpg')).toBe(true);
    expect(isAllowedPostImageMetadata('image/heif', 'photo.heic')).toBe(true);
    expect(isAllowedPostImageMetadata('image/png', 'photo.exe')).toBe(false);
    expect(isAllowedPostImageMetadata('image/png', 'photo.jpg')).toBe(false);
    expect(isAllowedPostImageMetadata('application/pdf', 'photo.jpg')).toBe(
      false,
    );
  });

  it.each([
    ['image/jpeg', 'photo.jpeg', signatures.jpeg],
    ['image/png', 'photo.png', signatures.png],
    ['image/webp', 'photo.webp', signatures.webp],
    ['image/heic', 'photo.heic', signatures.heif],
    ['image/heif', 'photo.heif', signatures.heif],
  ])('accepts a matching %s signature', (mime, name, signature) => {
    expect(isAllowedPostImage(file(mime, name, signature))).toBe(true);
  });

  it('rejects mismatched and invalid signatures', () => {
    const fake = Buffer.from('not-an-image');
    expect(
      isAllowedPostImage(file('image/png', 'photo.png', signatures.jpeg)),
    ).toBe(false);
    expect(
      isAllowedPostImage(file('image/jpeg', 'photo.png', signatures.png)),
    ).toBe(false);
    expect(isAllowedPostImage(file('image/jpeg', 'photo.jpg', fake))).toBe(
      false,
    );
  });

  it('rejects images larger than 8 MB before writing', async () => {
    const service = new PostStorageService(objectStorage);
    await expect(
      service.save(
        1,
        7,
        file(
          'image/jpeg',
          'photo.jpg',
          signatures.jpeg,
          POST_IMAGE_MAX_BYTES + 1,
        ),
      ),
    ).rejects.toThrow('Post image must be 8 MB or smaller');
  });

  it('stores and removes images through object storage', async () => {
    const service = new PostStorageService(objectStorage);
    const image = file('image/png', 'photo.png', signatures.png);
    const stored = await service.save(9, 7, image);

    expect(objectStorage.store).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: 7,
        purpose: 'community-posts/image',
        file: image,
        visibility: 'private',
      }),
    );
    expect(stored).toEqual({
      assetId: 'asset-id',
      storageKey: 'community-posts/image/1/demo.png',
      publicUrl: 'https://example.test/signed-image',
    });

    await service.remove('asset-id');
    expect(objectStorage.remove).toHaveBeenCalledWith('asset-id');
  });
});
