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
) =>
  ({mimetype, originalname, buffer, size} as Express.Multer.File);

describe('PostStorageService validation', () => {
  it('accepts supported metadata and rejects mismatched files', () => {
    expect(isAllowedPostImageMetadata('image/jpeg', 'photo.jpg')).toBe(true);
    expect(isAllowedPostImageMetadata('image/png', 'photo.exe')).toBe(false);
    expect(isAllowedPostImageMetadata('application/pdf', 'photo.jpg')).toBe(
      false,
    );
  });

  it('checks image signatures in addition to MIME type and extension', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const fake = Buffer.from('not-an-image');
    expect(isAllowedPostImage(file('image/jpeg', 'photo.jpg', jpeg))).toBe(
      true,
    );
    expect(isAllowedPostImage(file('image/jpeg', 'photo.jpg', fake))).toBe(
      false,
    );
  });

  it('rejects images larger than 8 MB before writing', async () => {
    const service = new PostStorageService();
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

    await expect(
      service.save(
        1,
        file('image/jpeg', 'photo.jpg', jpeg, POST_IMAGE_MAX_BYTES + 1),
      ),
    ).rejects.toThrow('Post image must be 8 MB or smaller');
  });
});
