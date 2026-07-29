import { Repository } from 'typeorm';
import { IdempotencyRecord } from './entities/idempotency-record.entity';
export declare class IdempotencyService {
    private readonly recordRepo;
    constructor(recordRepo: Repository<IdempotencyRecord>);
    hash(value: unknown): string;
    execute<T>(userId: number, scope: string, requestKey: string | undefined, request: unknown, operation: () => Promise<T>, ttlHours?: number): Promise<T>;
}
