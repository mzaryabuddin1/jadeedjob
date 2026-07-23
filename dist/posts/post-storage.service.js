"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostStorageService = exports.isAllowedPostImageMetadata = exports.isAllowedPostImage = exports.getPostUploadRoot = exports.POST_IMAGE_MAX_BYTES = exports.POST_IMAGE_FIELD = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const path_1 = require("path");
exports.POST_IMAGE_FIELD = 'image';
exports.POST_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const MIME_FORMATS = {
    'image/jpeg': 'jpeg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heif',
    'image/heif': 'heif',
};
const EXTENSION_FORMATS = {
    '.jpg': 'jpeg',
    '.jpeg': 'jpeg',
    '.png': 'png',
    '.webp': 'webp',
    '.heic': 'heif',
    '.heif': 'heif',
};
const getPostUploadRoot = () => process.env.POST_IMAGE_UPLOAD_DIR ||
    (0, path_1.join)(process.cwd(), 'uploads', 'community-posts');
exports.getPostUploadRoot = getPostUploadRoot;
const isAllowedPostImage = (file) => {
    if (!file || !(0, exports.isAllowedPostImageMetadata)(file.mimetype, file.originalname)) {
        return false;
    }
    return detectImageFormat(file.buffer) === MIME_FORMATS[file.mimetype];
};
exports.isAllowedPostImage = isAllowedPostImage;
const isAllowedPostImageMetadata = (mimeType, fileName) => {
    const mimeFormat = mimeType ? MIME_FORMATS[mimeType] : undefined;
    const extensionFormat = EXTENSION_FORMATS[(0, path_1.extname)(fileName || '').toLowerCase()];
    return Boolean(mimeFormat && mimeFormat === extensionFormat);
};
exports.isAllowedPostImageMetadata = isAllowedPostImageMetadata;
const detectImageFormat = (buffer) => {
    if (!buffer || buffer.length < 12)
        return null;
    const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const png = buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
    const webp = buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    const heifBrand = buffer.subarray(4, 12).toString('ascii');
    const heif = heifBrand.startsWith('ftyp') &&
        ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(buffer.subarray(8, 12).toString('ascii'));
    if (jpeg)
        return 'jpeg';
    if (png)
        return 'png';
    if (webp)
        return 'webp';
    if (heif)
        return 'heif';
    return null;
};
const getExtension = (file) => {
    const extension = (0, path_1.extname)(file.originalname || '').toLowerCase();
    if (EXTENSION_FORMATS[extension])
        return extension;
    if (file.mimetype === 'image/png')
        return '.png';
    if (file.mimetype === 'image/webp')
        return '.webp';
    if (file.mimetype === 'image/heic')
        return '.heic';
    if (file.mimetype === 'image/heif')
        return '.heif';
    return '.jpg';
};
let PostStorageService = class PostStorageService {
    async save(postId, file) {
        if (file.size > exports.POST_IMAGE_MAX_BYTES) {
            throw new common_1.BadRequestException('Post image must be 8 MB or smaller');
        }
        if (!(0, exports.isAllowedPostImage)(file)) {
            throw new common_1.BadRequestException('Post image must be JPEG, PNG, WebP, HEIC, or HEIF');
        }
        const root = (0, exports.getPostUploadRoot)();
        if (!(0, fs_1.existsSync)(root))
            (0, fs_1.mkdirSync)(root, { recursive: true });
        const fileName = `${postId}-${(0, crypto_1.randomUUID)()}${getExtension(file)}`;
        const path = (0, path_1.join)(root, fileName);
        await (0, promises_1.writeFile)(path, file.buffer);
        const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
        return {
            storageKey: `community-posts/${fileName}`,
            publicUrl: `${appUrl}/uploads/community-posts/${fileName}`,
        };
    }
    async remove(storageKey) {
        if (!storageKey)
            return;
        const fileName = storageKey.split('/').pop();
        if (!fileName)
            return;
        try {
            await (0, promises_1.unlink)((0, path_1.join)((0, exports.getPostUploadRoot)(), fileName));
        }
        catch {
        }
    }
};
exports.PostStorageService = PostStorageService;
exports.PostStorageService = PostStorageService = __decorate([
    (0, common_1.Injectable)()
], PostStorageService);
//# sourceMappingURL=post-storage.service.js.map