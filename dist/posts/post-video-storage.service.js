"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostVideoStorageService = exports.isAllowedPostVideoProbeFormat = exports.isAllowedPostVideoFileName = exports.isAllowedPostVideoMimeType = exports.ensurePostVideoDirectory = exports.getPostVideoTmpDir = exports.getPostVideoUploadRoot = exports.POST_VIDEO_MAX_BYTES = exports.POST_VIDEO_FILE_FIELD = void 0;
const common_1 = require("@nestjs/common");
const child_process_1 = require("child_process");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const util_1 = require("util");
const object_storage_service_1 = require("../storage/object-storage.service");
exports.POST_VIDEO_FILE_FIELD = 'video';
exports.POST_VIDEO_MAX_BYTES = 100 * 1024 * 1024;
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const ALLOWED_VIDEO_MIME_TYPES = new Set([
    'video/mp4',
    'video/quicktime',
    'video/x-m4v',
]);
const ALLOWED_VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v']);
const getPostVideoUploadRoot = () => process.env.POST_VIDEO_UPLOAD_DIR ||
    (0, path_1.join)(process.cwd(), 'uploads', 'community-post-videos');
exports.getPostVideoUploadRoot = getPostVideoUploadRoot;
const getPostVideoTmpDir = () => (0, path_1.join)((0, exports.getPostVideoUploadRoot)(), 'tmp');
exports.getPostVideoTmpDir = getPostVideoTmpDir;
const ensurePostVideoDirectory = (path) => {
    if (!(0, fs_1.existsSync)(path))
        (0, fs_1.mkdirSync)(path, { recursive: true });
};
exports.ensurePostVideoDirectory = ensurePostVideoDirectory;
const isAllowedPostVideoMimeType = (contentType) => Boolean(contentType && ALLOWED_VIDEO_MIME_TYPES.has(contentType));
exports.isAllowedPostVideoMimeType = isAllowedPostVideoMimeType;
const isAllowedPostVideoFileName = (fileName) => ALLOWED_VIDEO_EXTENSIONS.has((0, path_1.extname)(fileName || '').toLowerCase());
exports.isAllowedPostVideoFileName = isAllowedPostVideoFileName;
const isAllowedPostVideoProbeFormat = (formatName) => String(formatName || '')
    .toLowerCase()
    .split(',')
    .some((format) => format === 'mov' || format === 'mp4');
exports.isAllowedPostVideoProbeFormat = isAllowedPostVideoProbeFormat;
const normalizedExtension = (fileName, contentType) => {
    const extension = (0, path_1.extname)(fileName || '').toLowerCase();
    if (ALLOWED_VIDEO_EXTENSIONS.has(extension))
        return extension;
    return contentType === 'video/quicktime' ? '.mov' : '.mp4';
};
let PostVideoStorageService = class PostVideoStorageService {
    constructor(objectStorage) {
        this.objectStorage = objectStorage;
    }
    getUploadInstructions(post, session) {
        const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
        return {
            uploadId: session.uploadId,
            method: 'POST',
            url: `${appUrl}/posts/${post.id}/video-upload`,
            fields: { uploadId: session.uploadId },
            headers: {},
            fileField: exports.POST_VIDEO_FILE_FIELD,
            expiresAt: session.expiresAt,
        };
    }
    createUploadKey(postId, fileName, contentType) {
        return `community-post-videos/${postId}/${(0, crypto_1.randomUUID)()}${normalizedExtension(fileName, contentType)}`;
    }
    async commitUpload(post, session, file) {
        const root = (0, exports.getPostVideoUploadRoot)();
        (0, exports.ensurePostVideoDirectory)(root);
        const extension = normalizedExtension(file.originalname || session.originalFileName, file.mimetype || session.contentType);
        const fileName = `${post.id}-${(0, crypto_1.randomUUID)()}${extension}`;
        const localFilePath = (0, path_1.join)(root, fileName);
        await (0, promises_1.rename)(file.path, localFilePath);
        return {
            fileName,
            storageKey: session.uploadKey,
            localFilePath,
            publicUrl: null,
        };
    }
    async inspectVideo(localFilePath) {
        try {
            const { stdout } = await execFileAsync(process.env.FFPROBE_PATH || 'ffprobe', [
                '-v',
                'error',
                '-select_streams',
                'v:0',
                '-show_entries',
                'stream=codec_type,duration:format=format_name,duration',
                '-of',
                'json',
                localFilePath,
            ], { maxBuffer: 1024 * 1024 });
            const result = JSON.parse(stdout || '{}');
            if (!Array.isArray(result.streams) || !result.streams.length) {
                throw new Error('No video stream');
            }
            if (!(0, exports.isAllowedPostVideoProbeFormat)(result.format?.format_name)) {
                throw new Error('Unsupported video container');
            }
            const rawDuration = result.streams[0]?.duration ?? result.format?.duration ?? null;
            const duration = Number(rawDuration);
            return {
                durationSeconds: Number.isFinite(duration) && duration > 0
                    ? Math.ceil(duration)
                    : null,
            };
        }
        catch {
            throw new common_1.BadRequestException('Uploaded file is not a valid video');
        }
    }
    async createThumbnail(postId, localFilePath) {
        const root = (0, exports.getPostVideoUploadRoot)();
        (0, exports.ensurePostVideoDirectory)(root);
        const fileName = `${postId}-${(0, crypto_1.randomUUID)()}-poster.jpg`;
        const thumbnailPath = (0, path_1.join)(root, fileName);
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
        }
        catch {
            await this.deleteLocalFile(thumbnailPath);
            throw new common_1.BadRequestException('Could not create a video preview');
        }
        return {
            fileName,
            localFilePath: thumbnailPath,
        };
    }
    async storeCompletedMedia(post, session, thumbnail) {
        if (!session.localFilePath) {
            throw new common_1.BadRequestException('Uploaded video file is missing');
        }
        const videoStats = await (0, promises_1.stat)(session.localFilePath);
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
            maxBytes: exports.POST_VIDEO_MAX_BYTES,
            visibility: 'private',
            metadata: { postId: post.id, uploadId: session.uploadId },
        });
        try {
            const thumbnailStats = await (0, promises_1.stat)(thumbnail.localFilePath);
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
        }
        catch (error) {
            await this.objectStorage.remove(videoAsset);
            throw error;
        }
    }
    async remove(assetId, legacyStorageKey) {
        if (assetId) {
            await this.objectStorage.remove(assetId);
            return;
        }
        if (!legacyStorageKey)
            return;
        const fileName = legacyStorageKey.split('/').pop();
        if (!fileName)
            return;
        await this.deleteLocalFile((0, path_1.join)((0, exports.getPostVideoUploadRoot)(), fileName));
    }
    async deleteLocalFile(path) {
        if (!path)
            return;
        try {
            await (0, promises_1.unlink)(path);
        }
        catch {
        }
    }
};
exports.PostVideoStorageService = PostVideoStorageService;
exports.PostVideoStorageService = PostVideoStorageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [object_storage_service_1.ObjectStorageService])
], PostVideoStorageService);
//# sourceMappingURL=post-video-storage.service.js.map