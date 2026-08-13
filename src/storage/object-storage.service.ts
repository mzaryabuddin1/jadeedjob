import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash, randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { basename, dirname, extname, join, normalize } from 'path';
import { Like, Repository } from 'typeorm';
import { StoredAsset } from './entities/stored-asset.entity';

type StoreInput = {
  ownerUserId: number;
  purpose: string;
  file: Pick<
    Express.Multer.File,
    'buffer' | 'originalname' | 'mimetype' | 'size' | 'path'
  >;
  allowedTypes: string[];
  maxBytes: number;
  visibility?: 'public' | 'private';
  metadata?: Record<string, unknown>;
};

@Injectable()
export class ObjectStorageService implements OnModuleInit {
  private s3: S3Client | null = null;
  private readonly localRoot =
    process.env.LOCAL_UPLOAD_ROOT || join(process.cwd(), 'uploads', 'objects');

  constructor(
    @InjectRepository(StoredAsset)
    private readonly assetRepo: Repository<StoredAsset>,
  ) {}

  onModuleInit() {
    if (this.getProvider() !== 's3') return;
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
    this.s3 = new S3Client({
      region: process.env.S3_REGION,
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
    });
  }

  async store(input: StoreInput) {
    const buffer = await this.getBuffer(input.file);
    if (!buffer.length) throw new BadRequestException('Uploaded file is empty');
    if (buffer.length > input.maxBytes) {
      throw new BadRequestException('Uploaded file exceeds the allowed size');
    }
    const actualType = await this.detectContentType(buffer);
    const declaredType = this.normalizeContentType(input.file.mimetype);
    const allowedTypes = input.allowedTypes.map((type) =>
      this.normalizeContentType(type),
    );
    if (
      !allowedTypes.includes(declaredType) ||
      !allowedTypes.includes(actualType) ||
      declaredType !== actualType
    ) {
      throw new BadRequestException(
        'Uploaded file type does not match its content',
      );
    }

    const extension = this.safeExtension(input.file.originalname, actualType);
    const storageKey = `${input.purpose}/${input.ownerUserId}/${randomUUID()}${extension}`;
    const provider = this.getProvider();
    const sha256 = createHash('sha256').update(buffer).digest('hex');

    if (provider === 's3') {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: storageKey,
          Body: buffer,
          ContentType: actualType,
          Metadata: {
            ownerUserId: String(input.ownerUserId),
            purpose: input.purpose,
            sha256,
          },
        }),
      );
    } else {
      const path = join(this.localRoot, storageKey);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, buffer, { flag: 'wx' });
    }

    return this.assetRepo.save(
      this.assetRepo.create({
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
      }),
    );
  }

  async getUrl(assetOrId: StoredAsset | string, expiresIn = 900) {
    const asset =
      typeof assetOrId === 'string'
        ? await this.assetRepo.findOne({ where: { id: assetOrId } })
        : assetOrId;
    if (!asset || asset.deletedAt) return null;
    if (asset.provider === 's3') {
      return getSignedUrl(
        this.s3,
        new GetObjectCommand({
          Bucket: asset.bucket || process.env.S3_BUCKET,
          Key: asset.storageKey,
        }),
        { expiresIn },
      );
    }
    const base = (process.env.APP_URL || 'http://localhost:3000').replace(
      /\/+$/,
      '',
    );
    return `${base}/uploads/objects/${asset.storageKey}`;
  }

  async getAsset(assetId: string) {
    return this.assetRepo.findOne({ where: { id: assetId } });
  }

  async requireOwnedAsset(
    assetId: string,
    ownerUserId: number,
    purpose?: string,
  ) {
    const asset = await this.assetRepo.findOne({ where: { id: assetId } });
    if (
      !asset ||
      asset.deletedAt ||
      asset.ownerUserId !== ownerUserId ||
      (purpose && asset.purpose !== purpose)
    ) {
      throw new BadRequestException('Stored attachment is invalid');
    }
    return asset;
  }

  async findKnownAssetByUrl(value: string) {
    let fileName = '';
    try {
      fileName = basename(new URL(value).pathname);
    } catch {
      return null;
    }
    if (!fileName) return null;
    const assets = await this.assetRepo.find({
      where: { storageKey: Like(`%/${fileName}`) },
      take: 5,
    });
    return (
      assets.find(
        (asset) =>
          !asset.deletedAt &&
          decodeURIComponent(new URL(value).pathname).endsWith(asset.storageKey),
      ) || null
    );
  }

  async remove(assetOrId: StoredAsset | string) {
    const asset =
      typeof assetOrId === 'string'
        ? await this.assetRepo.findOne({ where: { id: assetOrId } })
        : assetOrId;
    if (!asset || asset.deletedAt) return;

    if (asset.provider === 's3') {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: asset.bucket || process.env.S3_BUCKET,
          Key: asset.storageKey,
        }),
      );
    } else {
      const path = join(this.localRoot, normalize(asset.storageKey));
      await unlink(path).catch(() => undefined);
    }
    asset.deletedAt = new Date();
    await this.assetRepo.save(asset);
  }

  getProvider(): 'local' | 's3' {
    const configured = process.env.STORAGE_PROVIDER;
    if (configured === 's3') return 's3';
    if (configured === 'local') return 'local';
    return ['staging', 'production'].includes(process.env.NODE_ENV || '')
      ? 's3'
      : 'local';
  }

  private async getBuffer(file: StoreInput['file']) {
    if (file.buffer) return file.buffer;
    if (!file.path) return Buffer.alloc(0);
    const { readFile } = await import('fs/promises');
    return readFile(file.path);
  }

  private async detectContentType(buffer: Buffer) {
    if (buffer.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }
    if (
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ) {
      return 'image/png';
    }
    if (
      buffer.subarray(0, 4).toString() === 'RIFF' &&
      buffer.subarray(8, 12).toString() === 'WEBP'
    ) {
      return 'image/webp';
    }
    if (buffer.subarray(4, 8).toString() === 'ftyp') {
      const brand = buffer.subarray(8, 12).toString().toLowerCase();
      if (['heic', 'heix', 'hevc', 'hevx'].includes(brand)) {
        return 'image/heic';
      }
      if (['mif1', 'msf1'].includes(brand)) return 'image/heif';
    }
    if (buffer.subarray(4, 8).toString() === 'ftyp') {
      const brand = buffer.subarray(8, 12).toString().toLowerCase();
      if (brand.includes('qt')) return 'video/quicktime';
      if (brand.includes('m4a')) return 'audio/mp4';
      return 'video/mp4';
    }
    if (
      buffer.length >= 4 &&
      buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
    ) {
      return 'video/webm';
    }
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x00 &&
      buffer[1] === 0x00 &&
      buffer[2] === 0x01 &&
      [0xba, 0xb3].includes(buffer[3])
    ) {
      return 'video/mpeg';
    }
    if (
      buffer.subarray(0, 3).toString() === 'ID3' ||
      (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
    ) {
      return 'audio/mpeg';
    }
    return 'application/octet-stream';
  }

  private safeExtension(originalName: string, contentType: string) {
    const allowed: Record<string, string[]> = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/heic': ['.heic'],
      'image/heif': ['.heif'],
      'application/pdf': ['.pdf'],
      'video/mp4': ['.mp4', '.m4v'],
      'video/quicktime': ['.mov'],
      'video/webm': ['.webm'],
      'video/mpeg': ['.mpeg', '.mpg'],
      'audio/mpeg': ['.mp3'],
      'audio/mp4': ['.m4a'],
    };
    const original = extname(originalName || '').toLowerCase();
    const expected = allowed[contentType] || [];
    if (!original || !expected.includes(original)) {
      throw new BadRequestException(
        'Uploaded file extension does not match its content',
      );
    }
    return original;
  }

  private normalizeContentType(contentType: string) {
    return contentType === 'video/x-m4v' ? 'video/mp4' : contentType;
  }
}
