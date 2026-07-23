import {
  isAllowedPostImage,
  isAllowedPostImageMetadata,
  POST_IMAGE_MAX_BYTES,
  PostStorageService,
} from './post-storage.service';
import { access, mkdtemp, readdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const file = (
  mimetype: string,
  originalname: string,
  buffer: Buffer,
  size = buffer.length,
) => ({ mimetype, originalname, buffer, size }) as Express.Multer.File;

describe('PostStorageService validation', () => {
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
    const service = new PostStorageService();
    await expect(
      service.save(
        1,
        file(
          'image/jpeg',
          'photo.jpg',
          signatures.jpeg,
          POST_IMAGE_MAX_BYTES + 1,
        ),
      ),
    ).rejects.toThrow('Post image must be 8 MB or smaller');
  });

  it('stores and removes files only in the dedicated post directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'community-posts-'));
    const previousRoot = process.env.POST_IMAGE_UPLOAD_DIR;
    process.env.POST_IMAGE_UPLOAD_DIR = root;

    try {
      const service = new PostStorageService();
      const stored = await service.save(
        9,
        file('image/png', 'photo.png', signatures.png),
      );
      const [savedFile] = await readdir(root);

      expect(stored.storageKey).toBe(`community-posts/${savedFile}`);
      await access(join(root, savedFile));

      await service.remove(stored.storageKey);
      await expect(access(join(root, savedFile))).rejects.toThrow();
    } finally {
      if (previousRoot === undefined) delete process.env.POST_IMAGE_UPLOAD_DIR;
      else process.env.POST_IMAGE_UPLOAD_DIR = previousRoot;
      await rm(root, { recursive: true, force: true });
    }
  });
});
