import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { rename, unlink } from 'fs/promises';
import { extname, join } from 'path';
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

const ALLOWED_REEL_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.webm', '.mpeg', '.mpg']);

const asPositiveNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const getReelMaxFileSizeBytes = () =>
  asPositiveNumber(process.env.REEL_MAX_FILE_SIZE_BYTES, DEFAULT_REEL_MAX_FILE_SIZE_BYTES);

export const getReelUploadTtlMinutes = () =>
  asPositiveNumber(process.env.REEL_UPLOAD_TTL_MINUTES, DEFAULT_REEL_UPLOAD_TTL_MINUTES);

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

export const normalizeReelExtension = (fileName?: string, contentType?: string) => {
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
  storageKey: string;
  localFilePath: string;
  publicUrl: string;
};

@Injectable()
export class ReelStorageService {
  getUploadInstructions(reel: Reel, session: ReelUploadSession) {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

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

  async commitLocalUpload(
    reel: Reel,
    session: ReelUploadSession,
    file: Express.Multer.File,
  ): Promise<StoredReelFile> {
    ensureDirectorySync(getReelUploadRoot());

    const extension = normalizeReelExtension(
      file.originalname || session.originalFileName,
      file.mimetype || session.contentType,
    );
    const fileName = `${reel.id}-${randomUUID()}${extension}`;
    const finalPath = join(getReelUploadRoot(), fileName);

    await rename(file.path, finalPath);

    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    return {
      fileName,
      storageKey: `reels/${fileName}`,
      localFilePath: finalPath,
      publicUrl: `${appUrl}/uploads/reels/${fileName}`,
    };
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
