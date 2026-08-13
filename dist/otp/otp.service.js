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
exports.OtpService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const crypto_1 = require("crypto");
const typeorm_2 = require("typeorm");
const otp_record_entity_1 = require("./entities/otp-record.entity");
let OtpService = class OtpService {
    constructor(otpRepo) {
        this.otpRepo = otpRepo;
        this.maxAttempts = 5;
    }
    hashOtp(purpose, target, otp) {
        const secret = process.env.OTP_HASH_SECRET || process.env.JWT_SECRET || 'dev-otp-secret';
        return (0, crypto_1.createHmac)('sha256', secret)
            .update(`${purpose}:${target}:${otp}`)
            .digest('hex');
    }
    normalizeUserId(userId) {
        return userId === undefined || userId === null ? null : Number(userId);
    }
    activeOtpQuery(input) {
        const query = this.otpRepo
            .createQueryBuilder('otp')
            .where('otp.purpose = :purpose', { purpose: input.purpose })
            .andWhere('otp.target = :target', { target: input.target })
            .andWhere('otp.usedAt IS NULL');
        const userId = this.normalizeUserId(input.userId);
        if (userId === null) {
            query.andWhere('otp.userId IS NULL');
        }
        else {
            query.andWhere('otp.userId = :userId', { userId });
        }
        return query;
    }
    generateCode() {
        return (0, crypto_1.randomInt)(100000, 1000000).toString();
    }
    async createOtp(input) {
        const target = String(input.target || '').trim();
        if (!target)
            throw new common_1.BadRequestException('OTP target is required');
        const activeRecords = await this.activeOtpQuery({
            purpose: input.purpose,
            target,
            userId: input.userId,
        }).getMany();
        if (activeRecords.length) {
            const now = new Date();
            await this.otpRepo.save(activeRecords.map((record) => ({
                ...record,
                usedAt: now,
            })));
        }
        const countQuery = this.otpRepo
            .createQueryBuilder('otp')
            .where('otp.purpose = :purpose', { purpose: input.purpose })
            .andWhere('otp.target = :target', { target });
        const userId = this.normalizeUserId(input.userId);
        if (userId === null) {
            countQuery.andWhere('otp.userId IS NULL');
        }
        else {
            countQuery.andWhere('otp.userId = :userId', { userId });
        }
        const resendCount = await countQuery.getCount();
        const otp = this.generateCode();
        const record = this.otpRepo.create({
            purpose: input.purpose,
            target,
            userId: this.normalizeUserId(input.userId),
            codeHash: this.hashOtp(input.purpose, target, otp),
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            attempts: 0,
            resendCount,
            metadata: input.metadata || {},
        });
        await this.otpRepo.save(record);
        return { otp, record };
    }
    async verifyOtp(input) {
        const target = String(input.target || '').trim();
        const otp = String(input.otp || '').trim();
        if (!target || !otp)
            throw new common_1.UnauthorizedException('Invalid OTP');
        const record = await this.activeOtpQuery({
            purpose: input.purpose,
            target,
            userId: input.userId,
        })
            .orderBy('otp.createdAt', 'DESC')
            .getOne();
        if (!record)
            throw new common_1.UnauthorizedException('OTP not found');
        if (record.expiresAt < new Date()) {
            record.usedAt = new Date();
            await this.otpRepo.save(record);
            throw new common_1.UnauthorizedException('OTP expired');
        }
        if (record.attempts >= this.maxAttempts) {
            record.usedAt = new Date();
            await this.otpRepo.save(record);
            throw new common_1.UnauthorizedException('Too many OTP attempts');
        }
        const submittedHash = this.hashOtp(input.purpose, target, otp);
        if (submittedHash !== record.codeHash) {
            record.attempts += 1;
            await this.otpRepo.save(record);
            throw new common_1.UnauthorizedException('Invalid OTP');
        }
        record.usedAt = new Date();
        await this.otpRepo.save(record);
        return record;
    }
    async wasRecentlyUsed(input, withinMs = 10 * 60 * 1000) {
        const target = String(input.target || '').trim();
        const otp = String(input.otp || '').trim();
        if (!target || !otp)
            return false;
        const query = this.otpRepo
            .createQueryBuilder('otp')
            .where('otp.purpose = :purpose', { purpose: input.purpose })
            .andWhere('otp.target = :target', { target })
            .andWhere('otp.usedAt IS NOT NULL')
            .andWhere('otp.usedAt >= :cutoff', {
            cutoff: new Date(Date.now() - withinMs),
        });
        const userId = this.normalizeUserId(input.userId);
        if (userId === null)
            query.andWhere('otp.userId IS NULL');
        else
            query.andWhere('otp.userId = :userId', { userId });
        const record = await query.orderBy('otp.usedAt', 'DESC').getOne();
        return Boolean(record &&
            record.codeHash === this.hashOtp(input.purpose, target, otp));
    }
    shouldExposeOtp() {
        return process.env.NODE_ENV !== 'production';
    }
    otpResponse(message, otp) {
        return this.shouldExposeOtp() ? { message, otp } : { message };
    }
};
exports.OtpService = OtpService;
exports.OtpService = OtpService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(otp_record_entity_1.OtpRecord)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], OtpService);
//# sourceMappingURL=otp.service.js.map