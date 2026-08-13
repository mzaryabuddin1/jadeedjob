import { HttpStatus, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import { readFile } from 'fs/promises';
import { basename } from 'path';
import { Repository } from 'typeorm';
import { ApiException } from 'src/common/errors/api-exception';
import { IdempotencyRecord } from './entities/idempotency-record.entity';

type ClaimedRecord<T> =
  | { kind: 'claimed'; record: IdempotencyRecord; leaseId: string }
  | { kind: 'replay'; value: T };

@Injectable()
export class IdempotencyService {
  private readonly leaseMs = 2 * 60 * 1000;

  constructor(
    @InjectRepository(IdempotencyRecord)
    private readonly recordRepo: Repository<IdempotencyRecord>,
  ) {}

  hash(value: unknown) {
    return createHash('sha256')
      .update(this.canonicalStringify(value))
      .digest('hex');
  }

  canonicalStringify(value: unknown) {
    return JSON.stringify(this.canonicalize(value));
  }

  async multipartRequest(
    body: unknown,
    file?: Pick<
      Express.Multer.File,
      'buffer' | 'path' | 'originalname' | 'mimetype' | 'size'
    >,
  ) {
    if (!file) return { body: this.canonicalize(body), file: null };
    const buffer = file.buffer || (file.path ? await readFile(file.path) : Buffer.alloc(0));
    return {
      body: this.canonicalize(body),
      file: {
        sha256: createHash('sha256').update(buffer).digest('hex'),
        sizeBytes: buffer.length || Number(file.size || 0),
        declaredMime: String(file.mimetype || '').toLowerCase(),
        detectedMime: this.detectMime(buffer),
        fileName: basename(String(file.originalname || ''))
          .normalize('NFKC')
          .trim(),
      },
    };
  }

  async execute<T>(
    userId: number,
    scope: string,
    requestKey: string | undefined,
    request: unknown,
    operation: () => Promise<T>,
    ttlHours = 24,
  ): Promise<T> {
    const key = String(requestKey || '').trim();
    if (!key) return operation();
    if (key.length > 120) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'IDEMPOTENCY_KEY_INVALID',
        'Idempotency key cannot exceed 120 characters',
      );
    }
    if (!scope || scope.length > 80) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'IDEMPOTENCY_SCOPE_INVALID',
        'Invalid idempotency operation scope',
      );
    }

    const requestHash = this.hash(request);
    const claim = await this.claim<T>(
      userId,
      scope,
      key,
      requestHash,
      ttlHours,
    );
    if (claim.kind === 'replay') return claim.value;

    try {
      const result = await operation();
      const completion = await this.recordRepo
        .createQueryBuilder()
        .update(IdempotencyRecord)
        .set({
          state: 'completed',
          responseStatus: HttpStatus.OK,
          responseBody: result as any,
          responseHeaders: {},
          completedAt: new Date(),
          leaseId: null,
          leaseExpiresAt: null,
          lastErrorCode: null,
        })
        .where('id = :id', { id: claim.record.id })
        .andWhere('leaseId = :leaseId', { leaseId: claim.leaseId })
        .execute();
      if (!completion.affected) {
        const resolved = await this.recordRepo.findOne({
          where: { id: claim.record.id },
        });
        if (resolved?.state === 'completed') {
          return resolved.responseBody as T;
        }
        throw this.inProgress();
      }
      return result;
    } catch (error) {
      await this.recordRepo
        .createQueryBuilder()
        .update(IdempotencyRecord)
        .set({
          state: 'failed',
          leaseId: null,
          leaseExpiresAt: null,
          lastErrorCode: this.errorCode(error),
        })
        .where('id = :id', { id: claim.record.id })
        .andWhere('leaseId = :leaseId', { leaseId: claim.leaseId })
        .execute();
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredRecords() {
    const now = new Date();
    await this.recordRepo
      .createQueryBuilder()
      .delete()
      .where('expiresAt <= :now', { now })
      .andWhere(
        "state != 'processing' OR leaseExpiresAt IS NULL OR leaseExpiresAt <= :now",
        { now },
      )
      .execute();
  }

  private async claim<T>(
    userId: number,
    scope: string,
    requestKey: string,
    requestHash: string,
    ttlHours: number,
  ): Promise<ClaimedRecord<T>> {
    const now = new Date();
    const leaseId = randomUUID();
    const leaseExpiresAt = new Date(now.getTime() + this.leaseMs);
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

    try {
      const result = await this.recordRepo.insert({
        userId,
        scope,
        requestKey,
        requestHash,
        state: 'processing',
        leaseId,
        leaseExpiresAt,
        attemptCount: 1,
        expiresAt,
      });
      const id = Number(result.identifiers?.[0]?.id);
      const record = id
        ? await this.recordRepo.findOne({ where: { id } })
        : await this.recordRepo.findOne({ where: { userId, scope, requestKey } });
      if (!record) throw new Error('Failed to claim idempotency key');
      return { kind: 'claimed', record, leaseId };
    } catch (error) {
      if (!this.isDuplicateKey(error)) throw error;
    }

    let existing = await this.recordRepo.findOne({
      where: { userId, scope, requestKey },
    });
    if (!existing) return this.claim(userId, scope, requestKey, requestHash, ttlHours);
    this.assertSamePayload(existing, requestHash);

    if (existing.state === 'completed' && existing.expiresAt > now) {
      return { kind: 'replay', value: existing.responseBody as T };
    }

    if (
      existing.expiresAt <= now &&
      (existing.state !== 'processing' ||
        !existing.leaseExpiresAt ||
        existing.leaseExpiresAt <= now)
    ) {
      const deleted = await this.recordRepo
        .createQueryBuilder()
        .delete()
        .where('id = :id', { id: existing.id })
        .andWhere('expiresAt <= :now', { now })
        .execute();
      if (deleted.affected) {
        return this.claim(userId, scope, requestKey, requestHash, ttlHours);
      }
      existing = await this.recordRepo.findOne({ where: { id: existing.id } });
      if (!existing) return this.claim(userId, scope, requestKey, requestHash, ttlHours);
      this.assertSamePayload(existing, requestHash);
    }

    const reclaimable =
      existing.state === 'failed' ||
      (existing.state === 'processing' &&
        (!existing.leaseExpiresAt || existing.leaseExpiresAt <= now));
    if (reclaimable) {
      const reclaimed = await this.recordRepo
        .createQueryBuilder()
        .update(IdempotencyRecord)
        .set({
          state: 'processing',
          leaseId,
          leaseExpiresAt,
          expiresAt,
          attemptCount: () => 'attemptCount + 1',
          lastErrorCode: null,
        })
        .where('id = :id', { id: existing.id })
        .andWhere('requestHash = :requestHash', { requestHash })
        .andWhere(
          "state = 'failed' OR (state = 'processing' AND (leaseExpiresAt IS NULL OR leaseExpiresAt <= :now))",
          { now },
        )
        .execute();
      if (reclaimed.affected) {
        return {
          kind: 'claimed',
          record: { ...existing, leaseId, leaseExpiresAt } as IdempotencyRecord,
          leaseId,
        };
      }
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const current = await this.recordRepo.findOne({ where: { id: existing.id } });
      if (!current) {
        return this.claim(userId, scope, requestKey, requestHash, ttlHours);
      }
      this.assertSamePayload(current, requestHash);
      if (current.state === 'completed') {
        return { kind: 'replay', value: current.responseBody as T };
      }
    }
    throw this.inProgress();
  }

  private assertSamePayload(record: IdempotencyRecord, requestHash: string) {
    if (record.requestHash !== requestHash) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        'IDEMPOTENCY_CONFLICT',
        'This idempotency key was already used for a different request',
      );
    }
  }

  private inProgress() {
    return new ApiException(
      HttpStatus.CONFLICT,
      'IDEMPOTENCY_IN_PROGRESS',
      'The original request is still being processed',
    );
  }

  private canonicalize(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return String(value);
      return Object.is(value, -0) ? 0 : value;
    }
    if (typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map((item) => this.canonicalize(item));
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        const item = (value as Record<string, unknown>)[key];
        if (item !== undefined) result[key] = this.canonicalize(item);
        return result;
      }, {});
  }

  private detectMime(buffer: Buffer) {
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
      if (['heic', 'heix', 'hevc', 'hevx'].includes(brand)) return 'image/heic';
      if (['mif1', 'msf1'].includes(brand)) return 'image/heif';
      if (brand.includes('qt')) return 'video/quicktime';
      return 'video/mp4';
    }
    return 'application/octet-stream';
  }

  private isDuplicateKey(error: unknown) {
    const value = error as any;
    return value?.code === 'ER_DUP_ENTRY' || Number(value?.errno) === 1062;
  }

  private errorCode(error: unknown) {
    if (error instanceof ApiException) {
      return String((error.getResponse() as any)?.code || 'REQUEST_FAILED');
    }
    return 'REQUEST_FAILED';
  }
}
