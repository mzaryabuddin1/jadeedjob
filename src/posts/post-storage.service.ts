import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { unlink, writeFile } from 'fs/promises';
import { extname, join } from 'path';

export const POST_IMAGE_FIELD = 'image';
export const POST_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.heif',
]);

export const getPostUploadRoot = () =>
  process.env.POST_IMAGE_UPLOAD_DIR ||
  join(process.cwd(), 'uploads', 'community-posts');

export const isAllowedPostImage = (file?: Express.Multer.File) => {
  return Boolean(
    file &&
      isAllowedPostImageMetadata(file.mimetype, file.originalname) &&
      hasAllowedSignature(file.buffer),
  );
};

export const isAllowedPostImageMetadata = (
  mimeType?: string,
  fileName?: string,
) => {
  if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) return false;
  return ALLOWED_EXTENSIONS.has(extname(fileName || '').toLowerCase());
};

const hasAllowedSignature = (buffer?: Buffer) => {
  if (!buffer || buffer.length < 12) return false;

  const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const png =
    buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
  const webp =
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  const heifBrand = buffer.subarray(4, 12).toString('ascii');
  const heif =
    heifBrand.startsWith('ftyp') &&
    ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(
      buffer.subarray(8, 12).toString('ascii'),
    );

  return jpeg || png || webp || heif;
};

const getExtension = (file: Express.Multer.File) => {
  const extension = extname(file.originalname || '').toLowerCase();
  if (ALLOWED_EXTENSIONS.has(extension)) return extension;
  if (file.mimetype === 'image/png') return '.png';
  if (file.mimetype === 'image/webp') return '.webp';
  if (file.mimetype === 'image/heic') return '.heic';
  if (file.mimetype === 'image/heif') return '.heif';
  return '.jpg';
};

@Injectable()
export class PostStorageService {
  async save(postId: number, file: Express.Multer.File) {
    if (file.size > POST_IMAGE_MAX_BYTES) {
      throw new BadRequestException('Post image must be 8 MB or smaller');
    }
    if (!isAllowedPostImage(file)) {
      throw new BadRequestException(
        'Post image must be JPEG, PNG, WebP, or HEIC',
      );
    }

    const root = getPostUploadRoot();
    if (!existsSync(root)) mkdirSync(root, { recursive: true });

    const fileName = `${postId}-${randomUUID()}${getExtension(file)}`;
    const path = join(root, fileName);
    await writeFile(path, file.buffer);

    const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    return {
      storageKey: `community-posts/${fileName}`,
      publicUrl: `${appUrl}/uploads/community-posts/${fileName}`,
    };
  }

  async remove(storageKey?: string | null) {
    if (!storageKey) return;
    const fileName = storageKey.split('/').pop();
    if (!fileName) return;

    try {
      await unlink(join(getPostUploadRoot(), fileName));
    } catch {
      // Stale media must not break post updates or deletion.
    }
  }
}
