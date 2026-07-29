import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { LessThanOrEqual, Repository } from 'typeorm';
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
  private finalizerRunning = false;

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
    await this.otpService.verifyOtp({
      purpose: 'account-deletion',
      target: user.phone,
      userId,
      otp,
    });

    const blockers = await this.companyRepo.find({
      where: { ownerId: userId },
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
    await this.userRepo.manager.transaction(async (manager) => {
      user.deletionScheduledAt = scheduledDeletionAt;
      user.tokenVersion = Number(user.tokenVersion || 0) + 1;
      await manager.save(user);
      await manager.getRepository(AccountDeletionRequest).save(
        manager.getRepository(AccountDeletionRequest).create({
          userId,
          status: 'scheduled',
          scheduledDeletionAt,
          blockerSnapshot: {},
        }),
      );
      await manager.getRepository(AuthSession).update(
        { userId },
        { revokedAt: new Date(), revokedReason: 'account_deletion' },
      );
    });
    await this.pushService.removeAllForUser(userId);
    return { scheduledDeletionAt };
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
      { status: 'recovered', recoveredAt: new Date() },
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
    if (this.finalizerRunning) return;
    this.finalizerRunning = true;
    try {
      const requests = await this.deletionRepo.find({
        where: {
          status: 'scheduled',
          scheduledDeletionAt: LessThanOrEqual(new Date()),
        },
        take: 25,
        order: { scheduledDeletionAt: 'ASC' },
      });
      for (const request of requests) {
        await this.finalizeOne(request);
      }
    } finally {
      this.finalizerRunning = false;
    }
  }

  private async finalizeOne(request: AccountDeletionRequest) {
    const user = await this.userRepo.findOne({ where: { id: request.userId } });
    if (!user || user.deletedAt || !user.deletionScheduledAt) {
      request.status = user?.deletedAt ? 'completed' : 'cancelled';
      await this.deletionRepo.save(request);
      return;
    }
    if (await this.companyRepo.count({ where: { ownerId: user.id } })) return;

    const removableAssets = await this.assetRepo.find({
      where: { ownerUserId: user.id },
    });
    for (const asset of removableAssets) {
      if (
        !asset.purpose.startsWith('company') &&
        !asset.purpose.startsWith('support') &&
        !asset.purpose.startsWith('chat')
      ) {
        await this.storageService.remove(asset).catch(() => undefined);
      }
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

      Object.assign(user, {
        email: null,
        phone: `deleted:${user.id}:${randomUUID()}`,
        firstName: 'Deleted',
        lastName: 'User',
        full_name: 'Deleted User',
        passwordHash: null,
        passwordSalt: null,
        profile_photo: null,
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
        id_document_front: null,
        id_document_back: null,
        address_proof_document: null,
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
        deletionScheduledAt: null,
        deletedAt: new Date(),
        isBanned: true,
        tokenVersion: Number(user.tokenVersion || 0) + 1,
      });
      await manager.save(user);
      request.status = 'completed';
      request.completedAt = new Date();
      await manager.save(request);
    });
    await this.pushService.removeAllForUser(user.id);
  }

  private async requireUser(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
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
