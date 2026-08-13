import { BadRequestException, Injectable } from '@nestjs/common';
import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { rename, stat, unlink } from 'fs/promises';
import { extname, join } from 'path';
import { promisify } from 'util';
import { ObjectStorageService } from 'src/storage/object-storage.service';
import { CommunityPost } from './entities/community-post.entity';
import { PostVideoUploadSession } from './entities/post-video-upload-session.entity';

export const POST_VIDEO_FILE_FIELD = 'video';
export const POST_VIDEO_MAX_BYTES = 100 * 1024 * 1024;

const execFileAsync = promisify(execFile);
const ALLOWED_VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/x-m4v',
]);
const ALLOWED_VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v']);

export const getPostVideoUploadRoot = () =>
  process.env.POST_VIDEO_UPLOAD_DIR ||
  join(process.cwd(), 'uploads', 'community-post-videos');

export const getPostVideoTmpDir = () => join(getPostVideoUploadRoot(), 'tmp');

export const ensurePostVideoDirectory = (path: string) => {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
};

export const isAllowedPostVideoMimeType = (contentType?: string) =>
  Boolean(contentType && ALLOWED_VIDEO_MIME_TYPES.has(contentType));

export const isAllowedPostVideoFileName = (fileName?: string) =>
  ALLOWED_VIDEO_EXTENSIONS.has(extname(fileName || '').toLowerCase());

export const isAllowedPostVideoProbeFormat = (formatName?: string) =>
  String(formatName || '')
    .toLowerCase()
    .split(',')
    .some((format) => format === 'mov' || format === 'mp4');

const normalizedExtension = (fileName: string, contentType: string) => {
  const extension = extname(fileName || '').toLowerCase();
  if (ALLOWED_VIDEO_EXTENSIONS.has(extension)) return extension;
  return contentType === 'video/quicktime' ? '.mov' : '.mp4';
};

@Injectable()
export class PostVideoStorageService {
  constructor(private readonly objectStorage: ObjectStorageService) {}

  getUploadInstructions(post: CommunityPost, session: PostVideoUploadSession) {
    const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(
      /\/+$/,
      '',
    );
    return {
      uploadId: session.uploadId,
      method: 'POST',
      url: `${appUrl}/posts/${post.id}/video-upload`,
      fields: { uploadId: session.uploadId },
      headers: {},
      fileField: POST_VIDEO_FILE_FIELD,
      expiresAt: session.expiresAt,
    };
  }

  createUploadKey(postId: number, fileName: string, contentType: string) {
    return `community-post-videos/${postId}/${randomUUID()}${normalizedExtension(
      fileName,
      contentType,
    )}`;
  }

  async commitUpload(
    post: CommunityPost,
    session: PostVideoUploadSession,
    file: Express.Multer.File,
  ) {
    const root = getPostVideoUploadRoot();
    ensurePostVideoDirectory(root);
    const extension = normalizedExtension(
      file.originalname || session.originalFileName,
      file.mimetype || session.contentType,
    );
    const fileName = `${post.id}-${randomUUID()}${extension}`;
    const localFilePath = join(root, fileName);
    await rename(file.path, localFilePath);

    return {
      fileName,
      storageKey: session.uploadKey,
      localFilePath,
      publicUrl: null,
    };
  }

  async inspectVideo(localFilePath: string) {
    try {
      const { stdout } = await execFileAsync(
        process.env.FFPROBE_PATH || 'ffprobe',
        [
          '-v',
          'error',
          '-select_streams',
          'v:0',
          '-show_entries',
          'stream=codec_type,duration:format=format_name,duration',
          '-of',
          'json',
          localFilePath,
        ],
        { maxBuffer: 1024 * 1024 },
      );
      const result = JSON.parse(stdout || '{}');
      if (!Array.isArray(result.streams) || !result.streams.length) {
        throw new Error('No video stream');
      }
      if (!isAllowedPostVideoProbeFormat(result.format?.format_name)) {
        throw new Error('Unsupported video container');
      }
      const rawDuration =
        result.streams[0]?.duration ?? result.format?.duration ?? null;
      const duration = Number(rawDuration);
      return {
        durationSeconds:
          Number.isFinite(duration) && duration > 0
            ? Math.ceil(duration)
            : null,
      };
    } catch {
      throw new BadRequestException('Uploaded file is not a valid video');
    }
  }

  async createThumbnail(postId: number, localFilePath: string) {
    const root = getPostVideoUploadRoot();
    ensurePostVideoDirectory(root);
    const fileName = `${postId}-${randomUUID()}-poster.jpg`;
    const thumbnailPath = join(root, fileName);

    try {
      await execFileAsync(process.env.FFMPEG_PATH || 'ffmpeg', [
        '-hide_banner',
        '-loglevel',
        'error',
        '-ss',
        '0.25',
        '-i',
        localFilePath,
        '-frames:v',
        '1',
        '-vf',
        "scale='min(960,iw)':-2",
        '-q:v',
        '3',
        '-y',
        thumbnailPath,
      ]);
    } catch {
      await this.deleteLocalFile(thumbnailPath);
      throw new BadRequestException('Could not create a video preview');
    }

    return {
      fileName,
      localFilePath: thumbnailPath,
    };
  }

  async storeCompletedMedia(
    post: CommunityPost,
    session: PostVideoUploadSession,
    thumbnail: { fileName: string; localFilePath: string },
  ) {
    if (!session.localFilePath) {
      throw new BadRequestException('Uploaded video file is missing');
    }

    const videoStats = await stat(session.localFilePath);
    const videoAsset = await this.objectStorage.store({
      ownerUserId: session.userId,
      purpose: 'community-posts/video',
      file: {
        path: session.localFilePath,
        originalname: session.originalFileName,
        mimetype: session.uploadedContentType || session.contentType,
        size: videoStats.size,
        buffer: undefined,
      },
      allowedTypes: [...ALLOWED_VIDEO_MIME_TYPES],
      maxBytes: POST_VIDEO_MAX_BYTES,
      visibility: 'private',
      metadata: { postId: post.id, uploadId: session.uploadId },
    });

    try {
      const thumbnailStats = await stat(thumbnail.localFilePath);
      const thumbnailAsset = await this.objectStorage.store({
        ownerUserId: session.userId,
        purpose: 'community-posts/video-thumbnail',
        file: {
          path: thumbnail.localFilePath,
          originalname: thumbnail.fileName,
          mimetype: 'image/jpeg',
          size: thumbnailStats.size,
          buffer: undefined,
        },
        allowedTypes: ['image/jpeg'],
        maxBytes: 8 * 1024 * 1024,
        visibility: 'private',
        metadata: { postId: post.id, uploadId: session.uploadId },
      });
      return { videoAsset, thumbnailAsset };
    } catch (error) {
      await this.objectStorage.remove(videoAsset);
      throw error;
    }
  }

  async remove(assetId?: string | null, legacyStorageKey?: string | null) {
    if (assetId) {
      await this.objectStorage.remove(assetId);
      return;
    }
    if (!legacyStorageKey) return;
    const fileName = legacyStorageKey.split('/').pop();
    if (!fileName) return;
    await this.deleteLocalFile(join(getPostVideoUploadRoot(), fileName));
  }

  async deleteLocalFile(path?: string | null) {
    if (!path) return;
    try {
      await unlink(path);
    } catch {
      // Stale media must not break upload cleanup or post deletion.
    }
  }
}
