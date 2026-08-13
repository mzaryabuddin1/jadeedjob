import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, randomInt } from 'crypto';
import { Repository } from 'typeorm';
import { OtpPurpose, OtpRecord } from './entities/otp-record.entity';

type CreateOtpInput = {
  purpose: OtpPurpose;
  target: string;
  userId?: number | null;
  metadata?: Record<string, any>;
};

type VerifyOtpInput = {
  purpose: OtpPurpose;
  target: string;
  otp: string;
  userId?: number | null;
};

@Injectable()
export class OtpService {
  private readonly maxAttempts = 5;

  constructor(
    @InjectRepository(OtpRecord)
    private readonly otpRepo: Repository<OtpRecord>,
  ) {}

  private hashOtp(purpose: OtpPurpose, target: string, otp: string) {
    const secret =
      process.env.OTP_HASH_SECRET || process.env.JWT_SECRET || 'dev-otp-secret';

    return createHmac('sha256', secret)
      .update(`${purpose}:${target}:${otp}`)
      .digest('hex');
  }

  private normalizeUserId(userId?: number | null) {
    return userId === undefined || userId === null ? null : Number(userId);
  }

  private activeOtpQuery(input: Pick<CreateOtpInput, 'purpose' | 'target' | 'userId'>) {
    const query = this.otpRepo
      .createQueryBuilder('otp')
      .where('otp.purpose = :purpose', { purpose: input.purpose })
      .andWhere('otp.target = :target', { target: input.target })
      .andWhere('otp.usedAt IS NULL');

    const userId = this.normalizeUserId(input.userId);
    if (userId === null) {
      query.andWhere('otp.userId IS NULL');
    } else {
      query.andWhere('otp.userId = :userId', { userId });
    }

    return query;
  }

  private generateCode() {
    return randomInt(100000, 1000000).toString();
  }

  async createOtp(input: CreateOtpInput) {
    const target = String(input.target || '').trim();
    if (!target) throw new BadRequestException('OTP target is required');

    const activeRecords = await this.activeOtpQuery({
      purpose: input.purpose,
      target,
      userId: input.userId,
    }).getMany();

    if (activeRecords.length) {
      const now = new Date();
      await this.otpRepo.save(
        activeRecords.map((record) => ({
          ...record,
          usedAt: now,
        })),
      );
    }

    const countQuery = this.otpRepo
      .createQueryBuilder('otp')
      .where('otp.purpose = :purpose', { purpose: input.purpose })
      .andWhere('otp.target = :target', { target });
    const userId = this.normalizeUserId(input.userId);
    if (userId === null) {
      countQuery.andWhere('otp.userId IS NULL');
    } else {
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

  async verifyOtp(input: VerifyOtpInput) {
    const target = String(input.target || '').trim();
    const otp = String(input.otp || '').trim();
    if (!target || !otp) throw new UnauthorizedException('Invalid OTP');

    const record = await this.activeOtpQuery({
      purpose: input.purpose,
      target,
      userId: input.userId,
    })
      .orderBy('otp.createdAt', 'DESC')
      .getOne();

    if (!record) throw new UnauthorizedException('OTP not found');
    if (record.expiresAt < new Date()) {
      record.usedAt = new Date();
      await this.otpRepo.save(record);
      throw new UnauthorizedException('OTP expired');
    }
    if (record.attempts >= this.maxAttempts) {
      record.usedAt = new Date();
      await this.otpRepo.save(record);
      throw new UnauthorizedException('Too many OTP attempts');
    }

    const submittedHash = this.hashOtp(input.purpose, target, otp);
    if (submittedHash !== record.codeHash) {
      record.attempts += 1;
      await this.otpRepo.save(record);
      throw new UnauthorizedException('Invalid OTP');
    }

    record.usedAt = new Date();
    await this.otpRepo.save(record);

    return record;
  }

  async wasRecentlyUsed(input: VerifyOtpInput, withinMs = 10 * 60 * 1000) {
    const target = String(input.target || '').trim();
    const otp = String(input.otp || '').trim();
    if (!target || !otp) return false;
    const query = this.otpRepo
      .createQueryBuilder('otp')
      .where('otp.purpose = :purpose', { purpose: input.purpose })
      .andWhere('otp.target = :target', { target })
      .andWhere('otp.usedAt IS NOT NULL')
      .andWhere('otp.usedAt >= :cutoff', {
        cutoff: new Date(Date.now() - withinMs),
      });
    const userId = this.normalizeUserId(input.userId);
    if (userId === null) query.andWhere('otp.userId IS NULL');
    else query.andWhere('otp.userId = :userId', { userId });
    const record = await query.orderBy('otp.usedAt', 'DESC').getOne();
    return Boolean(
      record &&
        record.codeHash === this.hashOtp(input.purpose, target, otp),
    );
  }

  shouldExposeOtp() {
    return process.env.NODE_ENV !== 'production';
  }

  otpResponse(message: string, otp: string) {
    return this.shouldExposeOtp() ? { message, otp } : { message };
  }
}
