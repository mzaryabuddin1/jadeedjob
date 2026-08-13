import { BadRequestException, Injectable } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { extname, join } from 'path';
import { ObjectStorageService } from 'src/storage/object-storage.service';

export const POST_IMAGE_FIELD = 'image';
export const POST_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

type PostImageFormat = 'jpeg' | 'png' | 'webp' | 'heif';

const MIME_FORMATS: Record<string, PostImageFormat> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heif',
  'image/heif': 'heif',
};

const EXTENSION_FORMATS: Record<string, PostImageFormat> = {
  '.jpg': 'jpeg',
  '.jpeg': 'jpeg',
  '.png': 'png',
  '.webp': 'webp',
  '.heic': 'heif',
  '.heif': 'heif',
};

export const getPostUploadRoot = () =>
  process.env.POST_IMAGE_UPLOAD_DIR ||
  join(process.cwd(), 'uploads', 'community-posts');

export const isAllowedPostImage = (file?: Express.Multer.File) => {
  if (!file || !isAllowedPostImageMetadata(file.mimetype, file.originalname)) {
    return false;
  }

  return detectImageFormat(file.buffer) === MIME_FORMATS[file.mimetype];
};

export const isAllowedPostImageMetadata = (
  mimeType?: string,
  fileName?: string,
) => {
  const mimeFormat = mimeType ? MIME_FORMATS[mimeType] : undefined;
  const extensionFormat =
    EXTENSION_FORMATS[extname(fileName || '').toLowerCase()];
  return Boolean(mimeFormat && mimeFormat === extensionFormat);
};

const detectImageFormat = (buffer?: Buffer): PostImageFormat | null => {
  if (!buffer || buffer.length < 12) return null;

  const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const png = buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
  const webp =
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  const heifBrand = buffer.subarray(4, 12).toString('ascii');
  const heif =
    heifBrand.startsWith('ftyp') &&
    ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(
      buffer.subarray(8, 12).toString('ascii'),
    );

  if (jpeg) return 'jpeg';
  if (png) return 'png';
  if (webp) return 'webp';
  if (heif) return 'heif';
  return null;
};

@Injectable()
export class PostStorageService {
  constructor(private readonly objectStorage: ObjectStorageService) {}

  async save(postId: number, userId: number, file: Express.Multer.File) {
    if (file.size > POST_IMAGE_MAX_BYTES) {
      throw new BadRequestException('Post image must be 8 MB or smaller');
    }
    if (!isAllowedPostImage(file)) {
      throw new BadRequestException(
        'Post image must be JPEG, PNG, WebP, HEIC, or HEIF',
      );
    }

    const asset = await this.objectStorage.store({
      ownerUserId: userId,
      purpose: 'community-posts/image',
      file,
      allowedTypes: Object.keys(MIME_FORMATS),
      maxBytes: POST_IMAGE_MAX_BYTES,
      visibility: 'private',
      metadata: { postId },
    });
    return {
      assetId: asset.id,
      storageKey: asset.storageKey,
      publicUrl: await this.objectStorage.getUrl(asset),
    };
  }

  async remove(assetId?: string | null, legacyStorageKey?: string | null) {
    if (assetId) {
      await this.objectStorage.remove(assetId);
      return;
    }
    if (!legacyStorageKey) return;
    const fileName = legacyStorageKey.split('/').pop();
    if (!fileName) return;

    try {
      await unlink(join(getPostUploadRoot(), fileName));
    } catch {
      // Stale media must not break post updates or deletion.
    }
  }
}
