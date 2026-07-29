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
const typeorm_1 = require("@nestjs/typeorm");
const crypto_1 = require("crypto");
const typeorm_2 = require("typeorm");
const api_exception_1 = require("../common/errors/api-exception");
const idempotency_record_entity_1 = require("./entities/idempotency-record.entity");
let IdempotencyService = class IdempotencyService {
    constructor(recordRepo) {
        this.recordRepo = recordRepo;
    }
    hash(value) {
        return (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify(value ?? null))
            .digest('hex');
    }
    async execute(userId, scope, requestKey, request, operation, ttlHours = 24) {
        const key = String(requestKey || '').trim();
        if (!key)
            return operation();
        if (key.length > 120) {
            throw new api_exception_1.ApiException(common_1.HttpStatus.BAD_REQUEST, 'IDEMPOTENCY_KEY_INVALID', 'Idempotency key cannot exceed 120 characters');
        }
        const requestHash = this.hash(request);
        const existing = await this.recordRepo.findOne({
            where: { userId, scope, requestKey: key },
        });
        if (existing) {
            if (existing.requestHash !== requestHash) {
                throw new api_exception_1.ApiException(common_1.HttpStatus.CONFLICT, 'IDEMPOTENCY_CONFLICT', 'This idempotency key was already used for a different request');
            }
            if (existing.state === 'completed')
                return existing.responseBody;
            throw new api_exception_1.ApiException(common_1.HttpStatus.CONFLICT, 'IDEMPOTENCY_IN_PROGRESS', 'The original request is still being processed');
        }
        const record = await this.recordRepo.save(this.recordRepo.create({
            userId,
            scope,
            requestKey: key,
            requestHash,
            state: 'processing',
            expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
        }));
        try {
            const result = await operation();
            record.state = 'completed';
            record.responseStatus = common_1.HttpStatus.OK;
            record.responseBody = result;
            await this.recordRepo.save(record);
            return result;
        }
        catch (error) {
            await this.recordRepo.delete(record.id);
            throw error;
        }
    }
};
exports.IdempotencyService = IdempotencyService;
exports.IdempotencyService = IdempotencyService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(idempotency_record_entity_1.IdempotencyRecord)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], IdempotencyService);
//# sourceMappingURL=idempotency.service.js.map