import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import { ApiException } from 'src/common/errors/api-exception';
import { IdempotencyRecord } from './entities/idempotency-record.entity';

@Injectable()
export class IdempotencyService {
  constructor(
    @InjectRepository(IdempotencyRecord)
    private readonly recordRepo: Repository<IdempotencyRecord>,
  ) {}

  hash(value: unknown) {
    return createHash('sha256')
      .update(JSON.stringify(value ?? null))
      .digest('hex');
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

    const requestHash = this.hash(request);
    const existing = await this.recordRepo.findOne({
      where: { userId, scope, requestKey: key },
    });

    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new ApiException(
          HttpStatus.CONFLICT,
          'IDEMPOTENCY_CONFLICT',
          'This idempotency key was already used for a different request',
        );
      }
      if (existing.state === 'completed') return existing.responseBody as T;
      throw new ApiException(
        HttpStatus.CONFLICT,
        'IDEMPOTENCY_IN_PROGRESS',
        'The original request is still being processed',
      );
    }

    const record = await this.recordRepo.save(
      this.recordRepo.create({
        userId,
        scope,
        requestKey: key,
        requestHash,
        state: 'processing',
        expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
      }),
    );

    try {
      const result = await operation();
      record.state = 'completed';
      record.responseStatus = HttpStatus.OK;
      record.responseBody = result as Record<string, unknown>;
      await this.recordRepo.save(record);
      return result;
    } catch (error) {
      await this.recordRepo.delete(record.id);
      throw error;
    }
  }
}
