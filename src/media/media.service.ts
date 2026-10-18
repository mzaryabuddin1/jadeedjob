import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { closeSync, openSync, promises as fs, readSync } from 'fs';
import { join } from 'path';
import { EntityManager, In, IsNull, LessThan, Repository } from 'typeorm';
import { MediaFile, MediaKind } from './media-file.entity';

export const MEDIA_DIR = './uploads/media';

/** claimed mime type -> what the file's first bytes must look like */
const ALLOWED: Record<string, { kind: MediaKind; sniff: Sniff; ext: string }> =
  {
    'image/jpeg': { kind: 'image', sniff: 'jpeg', ext: '.jpg' },
    'image/png': { kind: 'image', sniff: 'png', ext: '.png' },
    'image/webp': { kind: 'image', sniff: 'webp', ext: '.webp' },
    'image/gif': { kind: 'image', sniff: 'gif', ext: '.gif' },
    'video/mp4': { kind: 'video', sniff: 'mp4', ext: '.mp4' },
    'video/quicktime': { kind: 'video', sniff: 'mp4', ext: '.mov' },
    'video/webm': { kind: 'video', sniff: 'webm', ext: '.webm' },
  };
type Sniff = 'jpeg' | 'png' | 'webp' | 'gif' | 'mp4' | 'webm';

export const allowedMimeTypes = () => Object.keys(ALLOWED);
export const extensionFor = (mime: string) => ALLOWED[mime]?.ext ?? '';

const mb = (n: number) => n * 1024 * 1024;
/** read at call time: .env is loaded after this file is imported */
export const maxImageBytes = () =>
  mb(Number(process.env.MEDIA_MAX_IMAGE_MB) || 10);
export const maxVideoBytes = () =>
  mb(Number(process.env.MEDIA_MAX_VIDEO_MB) || 100);
/** hard ceiling for multer; the real per-kind limits are enforced in register() */
export const MULTER_HARD_LIMIT = mb(500);

/** Look at the real file header: a renamed .exe with an image header is refused */
function sniffMatches(path: string, expected: Sniff): boolean {
  const fd = openSync(path, 'r');
  const buf = Buffer.alloc(16);
  try {
    readSync(fd, buf, 0, 16, 0);
  } finally {
    closeSync(fd);
  }
  switch (expected) {
    case 'jpeg':
      return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    case 'png':
      return buf.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
    case 'gif':
      return buf.subarray(0, 4).toString('ascii') === 'GIF8';
    case 'webp':
      return (
        buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buf.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    case 'mp4':
      return buf.subarray(4, 8).toString('ascii') === 'ftyp';
    case 'webm':
      return buf.subarray(0, 4).equals(Buffer.from('1a45dfa3', 'hex'));
  }
}

@Injectable()
export class MediaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(MediaFile) private readonly repo: Repository<MediaFile>,
  ) {}

  publicUrl(filename: string) {
    return `${process.env.APP_URL || 'http://localhost:3000'}/uploads/media/${filename}`;
  }

  /** Validate the file multer just stored and record it */
  async register(userId: number, file: Express.Multer.File) {
    const spec = ALLOWED[file.mimetype];
    try {
      if (!spec) throw new BadRequestException('Unsupported file type');
      if (!sniffMatches(file.path, spec.sniff)) {
        throw new BadRequestException(
          'The file content does not match its type',
        );
      }
      const max = spec.kind === 'image' ? maxImageBytes() : maxVideoBytes();
      if (file.size > max) {
        throw new BadRequestException(
          `${spec.kind === 'image' ? 'Images' : 'Videos'} can be at most ${Math.round(max / 1048576)} MB`,
        );
      }
    } catch (err) {
      await this.unlink(file.filename);
      throw err;
    }

    const saved = await this.repo.save(
      this.repo.create({
        userId,
        kind: spec.kind,
        mimeType: file.mimetype,
        size: file.size,
        filename: file.filename,
        url: this.publicUrl(file.filename),
        usedAt: null,
      }),
    );
    return this.view(saved);
  }

  view(m: MediaFile) {
    return {
      id: m.id,
      kind: m.kind,
      url: m.url,
      mimeType: m.mimeType,
      size: m.size,
    };
  }

  /**
   * Take ownership of the files a post wants to attach: they must be the
   * author's and still unused. Marks them used inside the caller's transaction.
   * Returned in the same order as `ids`.
   */
  async claim(userId: number, ids: number[], manager?: EntityManager) {
    if (!ids.length) return [];
    const repo = manager ? manager.getRepository(MediaFile) : this.repo;

    const rows = await repo.find({
      where: { id: In(ids), userId, usedAt: IsNull() },
    });
    if (rows.length !== new Set(ids).size) {
      throw new BadRequestException(
        'Some media files do not exist, are not yours, or were already used',
      );
    }
    await repo.update({ id: In(ids) }, { usedAt: new Date() });

    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids.map((id) => byId.get(id)!);
  }

  /** Delete one of my files that no post uses yet */
  async deleteUnused(userId: number, id: number) {
    const row = await this.repo.findOne({ where: { id, userId } });
    if (!row) throw new NotFoundException('File not found');
    if (row.usedAt) {
      throw new BadRequestException('This file is used by a post');
    }
    await this.unlink(row.filename);
    await this.repo.delete(id);
    return { message: 'File deleted' };
  }

  // ── cleanup of abandoned uploads ──

  onModuleInit() {
    if (process.env.NOTIFICATION_WORKER === 'off') return;
    this.timer = setInterval(() => void this.cleanup(), 60 * 60 * 1000);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async cleanup() {
    try {
      const old = await this.repo.find({
        where: {
          usedAt: IsNull(),
          createdAt: LessThan(new Date(Date.now() - 24 * 60 * 60 * 1000)),
        },
        take: 500,
      });
      for (const row of old) await this.unlink(row.filename);
      if (old.length) {
        await this.repo.delete(old.map((r) => r.id));
        this.logger.log(`Removed ${old.length} abandoned upload(s)`);
      }
    } catch (err) {
      this.logger.error(`Media cleanup failed: ${(err as Error)?.message}`);
    }
  }

  private async unlink(filename: string) {
    try {
      await fs.unlink(join(MEDIA_DIR, filename));
    } catch {
      /* already gone */
    }
  }
}
