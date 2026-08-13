'use strict';

const crypto = require('crypto');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} = require('@aws-sdk/client-s3');
const { SEED_NAMESPACE } = require('./fixtures');

const execFileAsync = promisify(execFile);

function storageProvider(env = process.env) {
  if (env.STORAGE_PROVIDER === 's3') return 's3';
  if (env.STORAGE_PROVIDER === 'local') return 'local';
  return ['staging', 'production'].includes(env.NODE_ENV || '')
    ? 's3'
    : 'local';
}

async function generateTemplates() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'jobsloot-demo-seed-'));
  const image = path.join(root, 'demo-image.png');
  const video = path.join(root, 'demo-video.mp4');
  const thumbnail = path.join(root, 'demo-video-poster.jpg');
  const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';

  await execFileAsync(ffmpeg, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'lavfi',
    '-i',
    'color=c=0x2F6F73:s=640x640',
    '-vf',
    'drawbox=x=70:y=70:w=500:h=500:color=0xF4F7F7:t=12',
    '-frames:v',
    '1',
    '-y',
    image,
  ]);

  await execFileAsync(ffmpeg, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'lavfi',
    '-i',
    'testsrc2=size=360x640:rate=24',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:sample_rate=44100',
    '-t',
    '2',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-movflags',
    '+faststart',
    '-y',
    video,
  ]);

  await execFileAsync(ffmpeg, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-ss',
    '0.5',
    '-i',
    video,
    '-frames:v',
    '1',
    '-q:v',
    '3',
    '-y',
    thumbnail,
  ]);

  return {
    root,
    image: {
      path: image,
      contentType: 'image/png',
      originalName: 'jobsloot-demo.png',
    },
    video: {
      path: video,
      contentType: 'video/mp4',
      originalName: 'jobsloot-demo.mp4',
    },
    thumbnail: {
      path: thumbnail,
      contentType: 'image/jpeg',
      originalName: 'jobsloot-demo-poster.jpg',
    },
    async dispose() {
      await fs.rm(root, { recursive: true, force: true });
    },
  };
}

class SeedMediaStore {
  constructor(options = {}) {
    this.env = options.env || process.env;
    this.provider = storageProvider(this.env);
    this.runId = options.runId || crypto.randomUUID();
    this.localRoot =
      this.env.LOCAL_UPLOAD_ROOT ||
      path.join(process.cwd(), 'uploads', 'objects');
    this.created = [];
    this.s3 = null;

    if (this.provider === 's3') {
      const required = [
        'S3_BUCKET',
        'S3_REGION',
        'S3_ACCESS_KEY_ID',
        'S3_SECRET_ACCESS_KEY',
      ];
      const missing = required.filter((key) => !this.env[key]);
      if (missing.length) {
        throw new Error(`Missing S3 configuration: ${missing.join(', ')}`);
      }
      this.s3 = new S3Client({
        region: this.env.S3_REGION,
        endpoint: this.env.S3_ENDPOINT || undefined,
        forcePathStyle: this.env.S3_FORCE_PATH_STYLE === 'true',
        credentials: {
          accessKeyId: this.env.S3_ACCESS_KEY_ID,
          secretAccessKey: this.env.S3_SECRET_ACCESS_KEY,
        },
      });
    }
  }

  async createAsset(conn, input) {
    const extension = path.extname(input.template.originalName).toLowerCase();
    const semantic = input.semantic.replace(/[^a-z0-9/_-]/gi, '-');
    const storageKey = `demo-seed/v2/${this.runId}/${semantic}${extension}`;
    const buffer = await fs.readFile(input.template.path);
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const id = crypto.randomUUID();

    await this.writePhysical({
      storageKey,
      buffer,
      contentType: input.template.contentType,
      ownerUserId: input.ownerUserId,
      purpose: input.purpose,
      sha256,
    });

    try {
      await conn.execute(
        `INSERT INTO stored_assets (
          id, ownerUserId, purpose, provider, bucket, storageKey,
          originalName, contentType, sizeBytes, sha256, visibility, metadata,
          deletedAt, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'private', ?, NULL, ?)`,
        [
          id,
          input.ownerUserId,
          input.purpose,
          this.provider,
          this.provider === 's3' ? this.env.S3_BUCKET : null,
          storageKey,
          input.template.originalName,
          input.template.contentType,
          buffer.length,
          sha256,
          JSON.stringify({
            seedNamespace: SEED_NAMESPACE,
            semantic: input.semantic,
            ...(input.metadata || {}),
          }),
          input.createdAt || new Date(),
        ],
      );
    } catch (error) {
      await this.removePhysical({
        provider: this.provider,
        bucket: this.provider === 's3' ? this.env.S3_BUCKET : null,
        storageKey,
      });
      throw error;
    }

    const record = {
      id,
      provider: this.provider,
      bucket: this.provider === 's3' ? this.env.S3_BUCKET : null,
      storageKey,
      contentType: input.template.contentType,
      sizeBytes: buffer.length,
      sha256,
    };
    this.created.push(record);
    return record;
  }

  async cleanupCreated() {
    await Promise.allSettled(
      this.created.map((asset) => this.removePhysical(asset)),
    );
    this.created = [];
  }

  async removeAssets(assets) {
    await Promise.allSettled(assets.map((asset) => this.removePhysical(asset)));
  }

  async writePhysical(input) {
    if (this.provider === 's3') {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.env.S3_BUCKET,
          Key: input.storageKey,
          Body: input.buffer,
          ContentType: input.contentType,
          Metadata: {
            owneruserid: String(input.ownerUserId),
            purpose: input.purpose,
            sha256: input.sha256,
            seednamespace: SEED_NAMESPACE,
          },
        }),
      );
      return;
    }

    const destination = path.join(this.localRoot, input.storageKey);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, input.buffer, { flag: 'wx' });
  }

  async removePhysical(asset) {
    if (!asset?.storageKey) return;
    if (asset.provider === 's3') {
      if (!this.s3) return;
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: asset.bucket || this.env.S3_BUCKET,
          Key: asset.storageKey,
        }),
      );
      return;
    }

    const normalized = path
      .normalize(asset.storageKey)
      .replace(/^\.\.(\/|\\)/, '');
    const target = path.join(this.localRoot, normalized);
    const relative = path.relative(this.localRoot, target);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`Unsafe demo asset path: ${asset.storageKey}`);
    }
    await fs.unlink(target).catch(() => undefined);
  }
}

module.exports = {
  SeedMediaStore,
  generateTemplates,
  storageProvider,
};
