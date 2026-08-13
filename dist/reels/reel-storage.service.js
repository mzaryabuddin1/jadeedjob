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
exports.ReelStorageService = exports.normalizeReelExtension = exports.isAllowedReelFileName = exports.isAllowedReelMimeType = exports.ensureDirectorySync = exports.getReelTmpUploadDir = exports.getReelUploadRoot = exports.getReelUploadTtlMinutes = exports.getReelMaxFileSizeBytes = exports.REEL_VIDEO_FILE_FIELD = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const object_storage_service_1 = require("../storage/object-storage.service");
exports.REEL_VIDEO_FILE_FIELD = 'video';
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
const asPositiveNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const getReelMaxFileSizeBytes = () => asPositiveNumber(process.env.REEL_MAX_FILE_SIZE_BYTES, DEFAULT_REEL_MAX_FILE_SIZE_BYTES);
exports.getReelMaxFileSizeBytes = getReelMaxFileSizeBytes;
const getReelUploadTtlMinutes = () => asPositiveNumber(process.env.REEL_UPLOAD_TTL_MINUTES, DEFAULT_REEL_UPLOAD_TTL_MINUTES);
exports.getReelUploadTtlMinutes = getReelUploadTtlMinutes;
const getReelUploadRoot = () => process.env.REEL_UPLOAD_DIR || (0, path_1.join)(process.cwd(), 'uploads', 'reels');
exports.getReelUploadRoot = getReelUploadRoot;
const getReelTmpUploadDir = () => (0, path_1.join)((0, exports.getReelUploadRoot)(), 'tmp');
exports.getReelTmpUploadDir = getReelTmpUploadDir;
const ensureDirectorySync = (path) => {
    if (!(0, fs_1.existsSync)(path)) {
        (0, fs_1.mkdirSync)(path, { recursive: true });
    }
};
exports.ensureDirectorySync = ensureDirectorySync;
const isAllowedReelMimeType = (contentType) => Boolean(contentType && ALLOWED_REEL_MIME_TYPES.has(contentType));
exports.isAllowedReelMimeType = isAllowedReelMimeType;
const isAllowedReelFileName = (fileName) => {
    const extension = (0, path_1.extname)(fileName || '').toLowerCase();
    return Boolean(extension && ALLOWED_REEL_EXTENSIONS.has(extension));
};
exports.isAllowedReelFileName = isAllowedReelFileName;
const normalizeReelExtension = (fileName, contentType) => {
    const extension = (0, path_1.extname)(fileName || '').toLowerCase();
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
exports.normalizeReelExtension = normalizeReelExtension;
let ReelStorageService = class ReelStorageService {
    constructor(objectStorage) {
        this.objectStorage = objectStorage;
    }
    getUploadInstructions(reel, session) {
        const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
        return {
            uploadId: session.uploadId,
            method: 'POST',
            url: `${appUrl}/reels/${reel.id}/upload`,
            fields: {
                uploadId: session.uploadId,
            },
            headers: {},
            fileField: exports.REEL_VIDEO_FILE_FIELD,
            expiresAt: session.expiresAt,
        };
    }
    createUploadKey(reelId, fileName, contentType) {
        const extension = (0, exports.normalizeReelExtension)(fileName, contentType);
        return `reels/${reelId}/${(0, crypto_1.randomUUID)()}${extension}`;
    }
    async commitUpload(reel, session, file) {
        try {
            const asset = await this.objectStorage.store({
                ownerUserId: reel.creatorId,
                purpose: 'reels/video',
                file,
                allowedTypes: [...ALLOWED_REEL_MIME_TYPES],
                maxBytes: (0, exports.getReelMaxFileSizeBytes)(),
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
        }
        finally {
            await this.deleteLocalFile(file.path);
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
        if (fileName)
            await this.deleteLocalFile((0, path_1.join)((0, exports.getReelUploadRoot)(), fileName));
    }
    async deleteLocalFile(filePath) {
        if (!filePath) {
            return;
        }
        try {
            await (0, promises_1.unlink)(filePath);
        }
        catch {
        }
    }
};
exports.ReelStorageService = ReelStorageService;
exports.ReelStorageService = ReelStorageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [object_storage_service_1.ObjectStorageService])
], ReelStorageService);
//# sourceMappingURL=reel-storage.service.js.map