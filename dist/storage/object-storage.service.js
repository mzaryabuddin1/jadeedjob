"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectStorageService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const crypto_1 = require("crypto");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const typeorm_2 = require("typeorm");
const stored_asset_entity_1 = require("./entities/stored-asset.entity");
let ObjectStorageService = class ObjectStorageService {
    constructor(assetRepo) {
        this.assetRepo = assetRepo;
        this.s3 = null;
        this.localRoot = process.env.LOCAL_UPLOAD_ROOT || (0, path_1.join)(process.cwd(), 'uploads', 'objects');
    }
    onModuleInit() {
        if (this.provider() !== 's3')
            return;
        const required = [
            'S3_BUCKET',
            'S3_REGION',
            'S3_ACCESS_KEY_ID',
            'S3_SECRET_ACCESS_KEY',
        ];
        const missing = required.filter((key) => !process.env[key]);
        if (missing.length) {
            throw new Error(`Missing S3 configuration: ${missing.join(', ')}`);
        }
        this.s3 = new client_s3_1.S3Client({
            region: process.env.S3_REGION,
            endpoint: process.env.S3_ENDPOINT || undefined,
            forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY_ID,
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            },
        });
    }
    async store(input) {
        const buffer = await this.getBuffer(input.file);
        if (!buffer.length)
            throw new common_1.BadRequestException('Uploaded file is empty');
        if (buffer.length > input.maxBytes) {
            throw new common_1.BadRequestException('Uploaded file exceeds the allowed size');
        }
        const actualType = await this.detectContentType(buffer);
        if (!input.allowedTypes.includes(input.file.mimetype) ||
            !input.allowedTypes.includes(actualType) ||
            input.file.mimetype !== actualType) {
            throw new common_1.BadRequestException('Uploaded file type does not match its content');
        }
        const extension = this.safeExtension(input.file.originalname, actualType);
        const storageKey = `${input.purpose}/${input.ownerUserId}/${(0, crypto_1.randomUUID)()}${extension}`;
        const provider = this.provider();
        const sha256 = (0, crypto_1.createHash)('sha256').update(buffer).digest('hex');
        if (provider === 's3') {
            await this.s3.send(new client_s3_1.PutObjectCommand({
                Bucket: process.env.S3_BUCKET,
                Key: storageKey,
                Body: buffer,
                ContentType: actualType,
                Metadata: {
                    ownerUserId: String(input.ownerUserId),
                    purpose: input.purpose,
                    sha256,
                },
            }));
        }
        else {
            const path = (0, path_1.join)(this.localRoot, storageKey);
            await (0, promises_1.mkdir)((0, path_1.dirname)(path), { recursive: true });
            await (0, promises_1.writeFile)(path, buffer, { flag: 'wx' });
        }
        return this.assetRepo.save(this.assetRepo.create({
            ownerUserId: input.ownerUserId,
            purpose: input.purpose,
            provider,
            bucket: provider === 's3' ? process.env.S3_BUCKET : null,
            storageKey,
            originalName: input.file.originalname || null,
            contentType: actualType,
            sizeBytes: buffer.length,
            sha256,
            visibility: input.visibility || 'private',
            metadata: input.metadata || {},
        }));
    }
    async getUrl(assetOrId, expiresIn = 900) {
        const asset = typeof assetOrId === 'string'
            ? await this.assetRepo.findOne({ where: { id: assetOrId } })
            : assetOrId;
        if (!asset || asset.deletedAt)
            return null;
        if (asset.provider === 's3') {
            return (0, s3_request_presigner_1.getSignedUrl)(this.s3, new client_s3_1.GetObjectCommand({
                Bucket: asset.bucket || process.env.S3_BUCKET,
                Key: asset.storageKey,
            }), { expiresIn });
        }
        const base = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
        return `${base}/uploads/objects/${asset.storageKey}`;
    }
    async remove(assetOrId) {
        const asset = typeof assetOrId === 'string'
            ? await this.assetRepo.findOne({ where: { id: assetOrId } })
            : assetOrId;
        if (!asset || asset.deletedAt)
            return;
        if (asset.provider === 's3') {
            await this.s3.send(new client_s3_1.DeleteObjectCommand({
                Bucket: asset.bucket || process.env.S3_BUCKET,
                Key: asset.storageKey,
            }));
        }
        else {
            const path = (0, path_1.join)(this.localRoot, (0, path_1.normalize)(asset.storageKey));
            await (0, promises_1.unlink)(path).catch(() => undefined);
        }
        asset.deletedAt = new Date();
        await this.assetRepo.save(asset);
    }
    provider() {
        const configured = process.env.STORAGE_PROVIDER;
        if (configured === 's3')
            return 's3';
        if (configured === 'local')
            return 'local';
        return ['staging', 'production'].includes(process.env.NODE_ENV || '')
            ? 's3'
            : 'local';
    }
    async getBuffer(file) {
        if (file.buffer)
            return file.buffer;
        if (!file.path)
            return Buffer.alloc(0);
        const { readFile } = await Promise.resolve().then(() => __importStar(require('fs/promises')));
        return readFile(file.path);
    }
    async detectContentType(buffer) {
        if (buffer.subarray(0, 5).toString() === '%PDF-')
            return 'application/pdf';
        if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
            return 'image/jpeg';
        }
        if (buffer
            .subarray(0, 8)
            .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
            return 'image/png';
        }
        if (buffer.subarray(0, 4).toString() === 'RIFF' &&
            buffer.subarray(8, 12).toString() === 'WEBP') {
            return 'image/webp';
        }
        if (buffer.subarray(4, 8).toString() === 'ftyp') {
            const brand = buffer.subarray(8, 12).toString().toLowerCase();
            if (brand.includes('qt'))
                return 'video/quicktime';
            if (brand.includes('m4a'))
                return 'audio/mp4';
            return 'video/mp4';
        }
        if (buffer.subarray(0, 3).toString() === 'ID3' ||
            (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)) {
            return 'audio/mpeg';
        }
        return 'application/octet-stream';
    }
    safeExtension(originalName, contentType) {
        const allowed = {
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/webp': ['.webp'],
            'application/pdf': ['.pdf'],
            'video/mp4': ['.mp4', '.m4v'],
            'video/quicktime': ['.mov'],
            'audio/mpeg': ['.mp3'],
            'audio/mp4': ['.m4a'],
        };
        const original = (0, path_1.extname)(originalName || '').toLowerCase();
        const expected = allowed[contentType] || [];
        if (!original || !expected.includes(original)) {
            throw new common_1.BadRequestException('Uploaded file extension does not match its content');
        }
        return original;
    }
};
exports.ObjectStorageService = ObjectStorageService;
exports.ObjectStorageService = ObjectStorageService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(stored_asset_entity_1.StoredAsset)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ObjectStorageService);
//# sourceMappingURL=object-storage.service.js.map