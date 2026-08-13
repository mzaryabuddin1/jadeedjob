import { Repository } from 'typeorm';
import { IdempotencyRecord } from './entities/idempotency-record.entity';
export declare class IdempotencyService {
    private readonly recordRepo;
    private readonly leaseMs;
    constructor(recordRepo: Repository<IdempotencyRecord>);
    hash(value: unknown): string;
    canonicalStringify(value: unknown): string;
    multipartRequest(body: unknown, file?: Pick<Express.Multer.File, 'buffer' | 'path' | 'originalname' | 'mimetype' | 'size'>): Promise<{
        body: unknown;
        file: {
            sha256: string;
            sizeBytes: number;
            declaredMime: string;
            detectedMime: string;
            fileName: string;
        };
    }>;
    execute<T>(userId: number, scope: string, requestKey: string | undefined, request: unknown, operation: () => Promise<T>, ttlHours?: number): Promise<T>;
    cleanupExpiredRecords(): Promise<void>;
    private claim;
    private assertSamePayload;
    private inProgress;
    private canonicalize;
    private detectMime;
    private isDuplicateKey;
    private errorCode;
}
