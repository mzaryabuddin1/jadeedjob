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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdempotencyService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("@nestjs/typeorm");
const crypto_1 = require("crypto");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const typeorm_2 = require("typeorm");
const api_exception_1 = require("../common/errors/api-exception");
const idempotency_record_entity_1 = require("./entities/idempotency-record.entity");
let IdempotencyService = class IdempotencyService {
    constructor(recordRepo) {
        this.recordRepo = recordRepo;
        this.leaseMs = 2 * 60 * 1000;
    }
    hash(value) {
        return (0, crypto_1.createHash)('sha256')
            .update(this.canonicalStringify(value))
            .digest('hex');
    }
    canonicalStringify(value) {
        return JSON.stringify(this.canonicalize(value));
    }
    async multipartRequest(body, file) {
        if (!file)
            return { body: this.canonicalize(body), file: null };
        const buffer = file.buffer || (file.path ? await (0, promises_1.readFile)(file.path) : Buffer.alloc(0));
        return {
            body: this.canonicalize(body),
            file: {
                sha256: (0, crypto_1.createHash)('sha256').update(buffer).digest('hex'),
                sizeBytes: buffer.length || Number(file.size || 0),
                declaredMime: String(file.mimetype || '').toLowerCase(),
                detectedMime: this.detectMime(buffer),
                fileName: (0, path_1.basename)(String(file.originalname || ''))
                    .normalize('NFKC')
                    .trim(),
            },
        };
    }
    async execute(userId, scope, requestKey, request, operation, ttlHours = 24) {
        const key = String(requestKey || '').trim();
        if (!key)
            return operation();
        if (key.length > 120) {
            throw new api_exception_1.ApiException(common_1.HttpStatus.BAD_REQUEST, 'IDEMPOTENCY_KEY_INVALID', 'Idempotency key cannot exceed 120 characters');
        }
        if (!scope || scope.length > 80) {
            throw new api_exception_1.ApiException(common_1.HttpStatus.BAD_REQUEST, 'IDEMPOTENCY_SCOPE_INVALID', 'Invalid idempotency operation scope');
        }
        const requestHash = this.hash(request);
        const claim = await this.claim(userId, scope, key, requestHash, ttlHours);
        if (claim.kind === 'replay')
            return claim.value;
        try {
            const result = await operation();
            const completion = await this.recordRepo
                .createQueryBuilder()
                .update(idempotency_record_entity_1.IdempotencyRecord)
                .set({
                state: 'completed',
                responseStatus: common_1.HttpStatus.OK,
                responseBody: result,
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
                    return resolved.responseBody;
                }
                throw this.inProgress();
            }
            return result;
        }
        catch (error) {
            await this.recordRepo
                .createQueryBuilder()
                .update(idempotency_record_entity_1.IdempotencyRecord)
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
    async cleanupExpiredRecords() {
        const now = new Date();
        await this.recordRepo
            .createQueryBuilder()
            .delete()
            .where('expiresAt <= :now', { now })
            .andWhere("state != 'processing' OR leaseExpiresAt IS NULL OR leaseExpiresAt <= :now", { now })
            .execute();
    }
    async claim(userId, scope, requestKey, requestHash, ttlHours) {
        const now = new Date();
        const leaseId = (0, crypto_1.randomUUID)();
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
            if (!record)
                throw new Error('Failed to claim idempotency key');
            return { kind: 'claimed', record, leaseId };
        }
        catch (error) {
            if (!this.isDuplicateKey(error))
                throw error;
        }
        let existing = await this.recordRepo.findOne({
            where: { userId, scope, requestKey },
        });
        if (!existing)
            return this.claim(userId, scope, requestKey, requestHash, ttlHours);
        this.assertSamePayload(existing, requestHash);
        if (existing.state === 'completed' && existing.expiresAt > now) {
            return { kind: 'replay', value: existing.responseBody };
        }
        if (existing.expiresAt <= now &&
            (existing.state !== 'processing' ||
                !existing.leaseExpiresAt ||
                existing.leaseExpiresAt <= now)) {
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
            if (!existing)
                return this.claim(userId, scope, requestKey, requestHash, ttlHours);
            this.assertSamePayload(existing, requestHash);
        }
        const reclaimable = existing.state === 'failed' ||
            (existing.state === 'processing' &&
                (!existing.leaseExpiresAt || existing.leaseExpiresAt <= now));
        if (reclaimable) {
            const reclaimed = await this.recordRepo
                .createQueryBuilder()
                .update(idempotency_record_entity_1.IdempotencyRecord)
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
                .andWhere("state = 'failed' OR (state = 'processing' AND (leaseExpiresAt IS NULL OR leaseExpiresAt <= :now))", { now })
                .execute();
            if (reclaimed.affected) {
                return {
                    kind: 'claimed',
                    record: { ...existing, leaseId, leaseExpiresAt },
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
                return { kind: 'replay', value: current.responseBody };
            }
        }
        throw this.inProgress();
    }
    assertSamePayload(record, requestHash) {
        if (record.requestHash !== requestHash) {
            throw new api_exception_1.ApiException(common_1.HttpStatus.CONFLICT, 'IDEMPOTENCY_CONFLICT', 'This idempotency key was already used for a different request');
        }
    }
    inProgress() {
        return new api_exception_1.ApiException(common_1.HttpStatus.CONFLICT, 'IDEMPOTENCY_IN_PROGRESS', 'The original request is still being processed');
    }
    canonicalize(value) {
        if (value === null || value === undefined)
            return null;
        if (value instanceof Date)
            return value.toISOString();
        if (typeof value === 'number') {
            if (!Number.isFinite(value))
                return String(value);
            return Object.is(value, -0) ? 0 : value;
        }
        if (typeof value !== 'object')
            return value;
        if (Array.isArray(value))
            return value.map((item) => this.canonicalize(item));
        return Object.keys(value)
            .sort()
            .reduce((result, key) => {
            const item = value[key];
            if (item !== undefined)
                result[key] = this.canonicalize(item);
            return result;
        }, {});
    }
    detectMime(buffer) {
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
            if (['heic', 'heix', 'hevc', 'hevx'].includes(brand))
                return 'image/heic';
            if (['mif1', 'msf1'].includes(brand))
                return 'image/heif';
            if (brand.includes('qt'))
                return 'video/quicktime';
            return 'video/mp4';
        }
        return 'application/octet-stream';
    }
    isDuplicateKey(error) {
        const value = error;
        return value?.code === 'ER_DUP_ENTRY' || Number(value?.errno) === 1062;
    }
    errorCode(error) {
        if (error instanceof api_exception_1.ApiException) {
            return String(error.getResponse()?.code || 'REQUEST_FAILED');
        }
        return 'REQUEST_FAILED';
    }
};
exports.IdempotencyService = IdempotencyService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], IdempotencyService.prototype, "cleanupExpiredRecords", null);
exports.IdempotencyService = IdempotencyService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(idempotency_record_entity_1.IdempotencyRecord)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], IdempotencyService);
//# sourceMappingURL=idempotency.service.js.map