import {
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { LessThanOrEqual, Repository } from 'typeorm';
import { ApiException } from 'src/common/errors/api-exception';
import { AuthSessionService, SessionDeviceInput } from 'src/auth/auth-session.service';
import { AuthSession } from 'src/auth/entities/auth-session.entity';
import { OtpService } from 'src/otp/otp.service';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { ProfileBlock } from 'src/profiles/entities/profile-block.entity';
import { ProfileFollow } from 'src/profiles/entities/profile-follow.entity';
import { PushService } from 'src/push/push.service';
import { StoredAsset } from 'src/storage/entities/stored-asset.entity';
import { ObjectStorageService } from 'src/storage/object-storage.service';
import { TwilioService } from 'src/twilio/twilio.service';
import { User } from './entities/user.entity';
import { AccountDeletionRequest } from './entities/account-deletion-request.entity';
import { UsersService } from './users.service';

@Injectable()
export class AccountDeletionService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AccountDeletionRequest)
    private readonly deletionRepo: Repository<AccountDeletionRequest>,
    @InjectRepository(CompanyPage)
    private readonly companyRepo: Repository<CompanyPage>,
    @InjectRepository(AuthSession)
    private readonly sessionRepo: Repository<AuthSession>,
    @InjectRepository(ProfileFollow)
    private readonly followRepo: Repository<ProfileFollow>,
    @InjectRepository(ProfileBlock)
    private readonly blockRepo: Repository<ProfileBlock>,
    @InjectRepository(StoredAsset)
    private readonly assetRepo: Repository<StoredAsset>,
    private readonly otpService: OtpService,
    private readonly twilioService: TwilioService,
    private readonly authSessionService: AuthSessionService,
    private readonly pushService: PushService,
    private readonly storageService: ObjectStorageService,
    private readonly usersService: UsersService,
  ) {}

  async sendDeletionOtp(userId: number) {
    const user = await this.requireUser(userId);
    const { otp } = await this.otpService.createOtp({
      purpose: 'account-deletion',
      target: user.phone,
      userId,
    });
    await this.deliverOtp(user.phone, otp, 'account deletion');
    return this.otpService.otpResponse(`OTP sent to ${user.phone}`, otp);
  }

  async confirmDeletion(userId: number, otp: string) {
    const user = await this.requireUser(userId);
    const existing = await this.activeDeletionRequest(user.id);
    if (existing) return this.scheduledResponse(existing.scheduledDeletionAt);
    await this.otpService.verifyOtp({
      purpose: 'account-deletion',
      target: user.phone,
      userId,
      otp,
    });

    return this.scheduleDeletion(user);
  }

  async sendPublicDeletionOtp(phone: string) {
    const normalized = String(phone || '').trim();
    const user = await this.userRepo.findOne({ where: { phone: normalized } });
    if (user && !user.deletedAt && !user.deletionScheduledAt) {
      try {
        const { otp } = await this.otpService.createOtp({
          purpose: 'account-deletion',
          target: normalized,
          userId: user.id,
          metadata: { source: 'public-account-deletion' },
        });
        await this.deliverOtp(normalized, otp, 'account deletion');
      } catch {
        // Public responses remain enumeration-safe regardless of delivery state.
      }
    }
    return {
      message: 'If the account is eligible, an OTP has been sent.',
    };
  }

  async confirmPublicDeletion(phone: string, otp: string) {
    const normalized = String(phone || '').trim();
    const user = await this.userRepo.findOne({ where: { phone: normalized } });
    if (!user || user.deletedAt) throw this.publicDeletionOtpInvalid();

    try {
      await this.otpService.verifyOtp({
        purpose: 'account-deletion',
        target: normalized,
        userId: user.id,
        otp,
      });
    } catch {
      const replay = await this.otpService.wasRecentlyUsed({
          purpose: 'account-deletion',
          target: normalized,
          userId: user.id,
          otp,
        });
      if (!replay) throw this.publicDeletionOtpInvalid();
    }

    const existing = await this.activeDeletionRequest(user.id);
    if (existing) return this.scheduledResponse(existing.scheduledDeletionAt);
    try {
      return await this.scheduleDeletion(user);
    } catch (error) {
      if (error instanceof ConflictException) {
        const response = error.getResponse();
        if (
          typeof response === 'object' &&
          response !== null &&
          (response as any).code === 'ACCOUNT_DELETION_BLOCKED'
        ) {
          return {
            status: 'blocked' as const,
            code: 'ACCOUNT_DELETION_BLOCKED',
            message: (response as any).message,
            details: (response as any).details,
          };
        }
      }
      throw error;
    }
  }

  async sendRecoveryOtp(phone: string) {
    const user = await this.userRepo.findOne({ where: { phone } });
    if (user?.deletionScheduledAt && !user.deletedAt) {
      const { otp } = await this.otpService.createOtp({
        purpose: 'account-recovery',
        target: phone,
        userId: user.id,
      });
      await this.deliverOtp(phone, otp, 'account recovery');
      return this.otpService.otpResponse(`OTP sent to ${phone}`, otp);
    }
    return { message: `If recovery is available, an OTP was sent to ${phone}` };
  }

  async confirmRecovery(
    phone: string,
    otp: string,
    device: SessionDeviceInput,
  ) {
    const user = await this.userRepo.findOne({ where: { phone } });
    if (!user?.deletionScheduledAt || user.deletedAt) {
      throw new NotFoundException('Recoverable account not found');
    }
    await this.otpService.verifyOtp({
      purpose: 'account-recovery',
      target: phone,
      userId: user.id,
      otp,
    });

    user.deletionScheduledAt = null;
    user.tokenVersion = Number(user.tokenVersion || 0) + 1;
    await this.userRepo.save(user);
    await this.deletionRepo.update(
      { userId: user.id, status: 'scheduled' },
      {
        status: 'recovered',
        recoveredAt: new Date(),
        activeKey: null,
        processingClaimToken: null,
        processingClaimedAt: null,
      },
    );
    await this.authSessionService.revokeAllForUser(
      user.id,
      'account_recovered',
    );
    const session = await this.authSessionService.createSession(user, device);
    const { userId: _userId, ...tokens } = session as any;
    const profile = await this.usersService.getMyProfileResponse(user.id);
    return { ...tokens, profile: profile.user, ...profile };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async finalizeScheduledAccounts() {
    const requests = await this.deletionRepo.find({
      where: {
        status: 'scheduled',
        scheduledDeletionAt: LessThanOrEqual(new Date()),
      },
      select: ['id'],
      take: 25,
      order: { scheduledDeletionAt: 'ASC' },
    });
    for (const candidate of requests) {
      const claimed = await this.claimDeletion(candidate.id);
      if (!claimed) continue;
      try {
        await this.finalizeOne(claimed);
      } catch (error) {
        await this.deletionRepo.update(
          { id: claimed.id, processingClaimToken: claimed.processingClaimToken },
          {
            processingClaimToken: null,
            processingClaimedAt: null,
            lastError:
              error instanceof Error
                ? error.message.slice(0, 2000)
                : 'Account deletion finalization failed',
          },
        );
      }
    }
  }

  private async finalizeOne(request: AccountDeletionRequest) {
    const user = await this.userRepo.findOne({ where: { id: request.userId } });
    if (!user || user.deletedAt || !user.deletionScheduledAt) {
      request.status = user?.deletedAt ? 'completed' : 'cancelled';
      request.activeKey = null;
      request.processingClaimToken = null;
      request.processingClaimedAt = null;
      await this.deletionRepo.save(request);
      return;
    }
    if (await this.companyRepo.count({ where: { ownerId: user.id } })) {
      throw new Error('Company ownership still blocks account deletion');
    }

    const removableAssets = await this.assetRepo.find({
      where: { ownerUserId: user.id },
    });
    const companyContentAssetRows: Array<{ assetId: string | null }> =
      await this.userRepo.manager.query(
        `
          SELECT imageAssetId AS assetId FROM community_posts
          WHERE creatorId = ? AND publisherType = 'company' AND imageAssetId IS NOT NULL
          UNION SELECT videoAssetId AS assetId FROM community_posts
          WHERE creatorId = ? AND publisherType = 'company' AND videoAssetId IS NOT NULL
          UNION SELECT videoThumbnailAssetId AS assetId FROM community_posts
          WHERE creatorId = ? AND publisherType = 'company' AND videoThumbnailAssetId IS NOT NULL
          UNION SELECT videoAssetId AS assetId FROM reels
          WHERE creatorId = ? AND publisherType = 'company' AND videoAssetId IS NOT NULL
        `,
        [user.id, user.id, user.id, user.id],
      );
    const companyContentAssetIds = new Set(
      companyContentAssetRows.map((row) => row.assetId).filter(Boolean),
    );
    for (const asset of removableAssets) {
      if (
        this.assetMustBeRetained(asset.purpose) ||
        companyContentAssetIds.has(asset.id)
      ) {
        continue;
      }
      await this.storageService.remove(asset);
    }

    await this.userRepo.manager.transaction(async (manager) => {
      await manager.getRepository(ProfileFollow).delete([
        { followerUserId: user.id },
        { profileType: 'user', profileId: user.id },
      ] as any);
      await manager.getRepository(ProfileBlock).delete([
        { blockerUserId: user.id },
        { profileType: 'user', profileId: user.id },
      ] as any);
      await manager.getRepository(AuthSession).delete({ userId: user.id });
      await manager.query('DELETE FROM auth_identities WHERE userId = ?', [user.id]);
      await manager.query('DELETE FROM otp_records WHERE userId = ?', [user.id]);
      await manager.query('DELETE FROM push_devices WHERE userId = ?', [user.id]);
      await manager.query('DELETE FROM notifications WHERE userId = ?', [user.id]);
      await manager.query('DELETE FROM notification_preferences WHERE userId = ?', [user.id]);
      await manager.query('DELETE FROM idempotency_records WHERE userId = ?', [user.id]);
      await manager.query('DELETE FROM work_experience WHERE userId = ?', [user.id]);
      await manager.query('DELETE FROM education WHERE userId = ?', [user.id]);
      await manager.query('DELETE FROM certifications WHERE userId = ?', [user.id]);
      await manager.query(
        "UPDATE community_posts SET deletedAt = COALESCE(deletedAt, NOW()), moderationStatus = 'removed' WHERE creatorId = ? AND publisherType = 'user'",
        [user.id],
      );
      await manager.query(
        "UPDATE reels SET deletedAt = COALESCE(deletedAt, NOW()), status = 'deleted', moderationStatus = 'removed' WHERE creatorId = ? AND COALESCE(publisherType, 'user') = 'user'",
        [user.id],
      );
      await manager.query(
        "UPDATE jobs SET status = 'closed', isActive = 0 WHERE createdBy = ? AND pageId IS NULL",
        [user.id],
      );
      await manager.query(
        "UPDATE support_contact_messages SET name = 'Deleted User', phone = 'deleted' WHERE userId = ?",
        [user.id],
      );
      await manager.query(
        'UPDATE support_tickets SET contact = NULL, preferredContact = NULL WHERE userId = ?',
        [user.id],
      );

      Object.assign(user, {
        email: null,
        phone: `deleted:${user.id}:${randomUUID()}`,
        firstName: 'Deleted',
        lastName: 'User',
        full_name: 'Deleted User',
        father_name: null,
        gender: null,
        date_of_birth: null,
        nationality: null,
        marital_status: null,
        passwordHash: null,
        passwordSalt: null,
        phoneVerifiedAt: null,
        referralCode: null,
        systemRole: 'user',
        isVerified: false,
        suspendedAt: null,
        suspendedUntil: null,
        suspensionReason: null,
        profile_photo: null,
        profilePhotoAssetId: null,
        alternate_phone: null,
        address_line1: null,
        address_line2: null,
        city: null,
        state: null,
        postal_code: null,
        contact_country: null,
        latitude: null,
        longitude: null,
        national_id_number: null,
        passport_number: null,
        id_expiry_date: null,
        id_document_front: null,
        idDocumentFrontAssetId: null,
        id_document_back: null,
        idDocumentBackAssetId: null,
        address_proof_document: null,
        addressProofAssetId: null,
        bank_name: null,
        branch_name: null,
        account_number: null,
        iban: null,
        swift_code: null,
        professional_summary: null,
        skills: null,
        technical_skills: null,
        soft_skills: null,
        linkedin_url: null,
        github_url: null,
        portfolio_url: null,
        behance_url: null,
        languages_spoken: null,
        filter_preferences: null,
        fcmTokens: null,
        country: null,
        language: null,
        kyc_status: 'pending',
        verified_by_admin_id: null,
        verification_date: null,
        rejection_reason: null,
        notes: null,
        admin_notes: null,
        deletionScheduledAt: null,
        deletedAt: new Date(),
        isBanned: true,
        ratingAverage: 0,
        ratingCount: 0,
        tokenVersion: Number(user.tokenVersion || 0) + 1,
      });
      await manager.save(user);
      request.status = 'completed';
      request.completedAt = new Date();
      request.activeKey = null;
      request.processingClaimToken = null;
      request.processingClaimedAt = null;
      request.lastError = null;
      await manager.save(request);
    });
    await this.pushService.removeAllForUser(user.id);
  }

  private async requireUser(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async scheduleDeletion(user: User) {
    const blockers = await this.companyRepo.find({
      where: { ownerId: user.id },
      select: ['id', 'company_name'],
    });
    if (blockers.length) {
      throw new ConflictException({
        code: 'ACCOUNT_DELETION_BLOCKED',
        message: 'Transfer ownership of these companies before deleting the account',
        details: {
          companies: blockers.map((company) => ({
            companyId: company.id,
            name: company.company_name,
            reason: 'sole_owner',
          })),
        },
      });
    }

    const scheduledDeletionAt = new Date(
      Date.now() +
        Number(process.env.ACCOUNT_DELETION_GRACE_DAYS || 30) *
          24 *
          60 *
          60 *
          1000,
    );
    const response = await this.userRepo.manager.transaction(async (manager) => {
      const locked = await manager.getRepository(User).findOne({
        where: { id: user.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked || locked.deletedAt) throw this.publicDeletionOtpInvalid();
      const existing = await manager.getRepository(AccountDeletionRequest).findOne({
        where: { userId: user.id, status: 'scheduled' },
      });
      if (existing) return existing.scheduledDeletionAt;
      locked.deletionScheduledAt = scheduledDeletionAt;
      locked.tokenVersion = Number(locked.tokenVersion || 0) + 1;
      await manager.save(locked);
      await manager.getRepository(AccountDeletionRequest).save(
        manager.getRepository(AccountDeletionRequest).create({
          userId: user.id,
          status: 'scheduled',
          scheduledDeletionAt,
          blockerSnapshot: {},
          activeKey: `user:${user.id}`,
          processingAttempts: 0,
        }),
      );
      await manager.getRepository(AuthSession).update(
        { userId: user.id },
        { revokedAt: new Date(), revokedReason: 'account_deletion' },
      );
      return scheduledDeletionAt;
    });
    await this.pushService.removeAllForUser(user.id);
    return this.scheduledResponse(response);
  }

  private activeDeletionRequest(userId: number) {
    return this.deletionRepo.findOne({
      where: { userId, status: 'scheduled' },
      order: { createdAt: 'DESC' },
    });
  }

  private scheduledResponse(scheduledDeletionAt: Date) {
    return { status: 'scheduled' as const, scheduledDeletionAt };
  }

  private publicDeletionOtpInvalid() {
    return new ApiException(
      HttpStatus.UNAUTHORIZED,
      'ACCOUNT_DELETION_OTP_INVALID',
      'Invalid or expired account deletion OTP',
    );
  }

  private async claimDeletion(requestId: number) {
    const now = new Date();
    const claimToken = randomUUID();
    const staleBefore = new Date(now.getTime() - 30 * 60 * 1000);
    const result = await this.deletionRepo
      .createQueryBuilder()
      .update(AccountDeletionRequest)
      .set({
        processingClaimToken: claimToken,
        processingClaimedAt: now,
        processingAttempts: () => 'processingAttempts + 1',
        lastError: null,
      })
      .where('id = :requestId', { requestId })
      .andWhere("status = 'scheduled'")
      .andWhere(
        '(processingClaimedAt IS NULL OR processingClaimedAt <= :staleBefore)',
        { staleBefore },
      )
      .execute();
    if (!result.affected) return null;
    return this.deletionRepo.findOne({
      where: { id: requestId, processingClaimToken: claimToken },
    });
  }

  private assetMustBeRetained(purpose: string) {
    return ['company', 'support', 'chat', 'rating'].some((prefix) =>
      String(purpose || '').startsWith(prefix),
    );
  }

  private async deliverOtp(phone: string, otp: string, purpose: string) {
    if (
      !process.env.TWILIO_ACCOUNT_SID ||
      !process.env.TWILIO_AUTH_TOKEN ||
      !process.env.TWILIO_PHONE_NUMBER
    ) {
      return;
    }
    await this.twilioService.sendSms(
      phone,
      `Your JobsLoot ${purpose} OTP is ${otp}. It expires in 5 minutes.`,
    );
  }
}
