import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { unlink } from 'fs/promises';
import { extname, join } from 'path';
import { ObjectStorageService } from 'src/storage/object-storage.service';
import { Reel } from './entities/reel.entity';
import { ReelUploadSession } from './entities/reel-upload-session.entity';

export const REEL_VIDEO_FILE_FIELD = 'video';

const DEFAULT_REEL_MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
const DEFAULT_REEL_UPLOAD_TTL_MINUTES = 30;

const ALLOWED_REEL_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/x-m4v',
  'video/webm',
  'video/mpeg',
]);

const ALLOWED_REEL_EXTENSIONS = new Set([
  '.mp4',
  '.mov',
  '.m4v',
  '.webm',
  '.mpeg',
  '.mpg',
]);

const asPositiveNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const getReelMaxFileSizeBytes = () =>
  asPositiveNumber(
    process.env.REEL_MAX_FILE_SIZE_BYTES,
    DEFAULT_REEL_MAX_FILE_SIZE_BYTES,
  );

export const getReelUploadTtlMinutes = () =>
  asPositiveNumber(
    process.env.REEL_UPLOAD_TTL_MINUTES,
    DEFAULT_REEL_UPLOAD_TTL_MINUTES,
  );

export const getReelUploadRoot = () =>
  process.env.REEL_UPLOAD_DIR || join(process.cwd(), 'uploads', 'reels');

export const getReelTmpUploadDir = () => join(getReelUploadRoot(), 'tmp');

export const ensureDirectorySync = (path: string) => {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
};

export const isAllowedReelMimeType = (contentType?: string) =>
  Boolean(contentType && ALLOWED_REEL_MIME_TYPES.has(contentType));

export const isAllowedReelFileName = (fileName?: string) => {
  const extension = extname(fileName || '').toLowerCase();
  return Boolean(extension && ALLOWED_REEL_EXTENSIONS.has(extension));
};

export const normalizeReelExtension = (
  fileName?: string,
  contentType?: string,
) => {
  const extension = extname(fileName || '').toLowerCase();

  if (extension && ALLOWED_REEL_EXTENSIONS.has(extension)) {
    return extension;
  }

  if (contentType === 'video/quicktime') {
    return '.mov';
  }

  if (contentType === 'video/webm') {
    return '.webm';
  }

  if (contentType === 'video/mpeg') {
    return '.mpeg';
  }

  return '.mp4';
};

type StoredReelFile = {
  fileName: string;
  assetId: string;
  storageKey: string;
};

@Injectable()
export class ReelStorageService {
  constructor(private readonly objectStorage: ObjectStorageService) {}

  getUploadInstructions(reel: Reel, session: ReelUploadSession) {
    const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(
      /\/+$/,
      '',
    );

    return {
      uploadId: session.uploadId,
      method: 'POST',
      url: `${appUrl}/reels/${reel.id}/upload`,
      fields: {
        uploadId: session.uploadId,
      },
      headers: {},
      fileField: REEL_VIDEO_FILE_FIELD,
      expiresAt: session.expiresAt,
    };
  }

  createUploadKey(reelId: number, fileName: string, contentType: string) {
    const extension = normalizeReelExtension(fileName, contentType);
    return `reels/${reelId}/${randomUUID()}${extension}`;
  }

  async commitUpload(
    reel: Reel,
    session: ReelUploadSession,
    file: Express.Multer.File,
  ): Promise<StoredReelFile> {
    try {
      const asset = await this.objectStorage.store({
        ownerUserId: reel.creatorId,
        purpose: 'reels/video',
        file,
        allowedTypes: [...ALLOWED_REEL_MIME_TYPES],
        maxBytes: getReelMaxFileSizeBytes(),
        visibility: 'private',
        metadata: {
          reelId: reel.id,
          uploadId: session.uploadId,
        },
      });

      return {
        fileName: asset.originalName || file.originalname,
        assetId: asset.id,
        storageKey: asset.storageKey,
      };
    } finally {
      await this.deleteLocalFile(file.path);
    }
  }

  async remove(assetId?: string | null, legacyStorageKey?: string | null) {
    if (assetId) {
      await this.objectStorage.remove(assetId);
      return;
    }
    if (!legacyStorageKey) return;
    const fileName = legacyStorageKey.split('/').pop();
    if (fileName)
      await this.deleteLocalFile(join(getReelUploadRoot(), fileName));
  }

  async deleteLocalFile(filePath?: string) {
    if (!filePath) {
      return;
    }

    try {
      await unlink(filePath);
    } catch {
      // Cleanup is best-effort; callers should not fail user flows on stale files.
    }
  }
}
