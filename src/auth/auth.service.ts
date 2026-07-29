import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { pbkdf2Sync, randomBytes } from 'crypto';
import { User } from 'src/users/entities/user.entity';
import { Country } from 'src/country/entities/country.entity';
import { Language } from 'src/language/entities/language.entity';
import { FilterService } from 'src/filter/filter.service';
import { computeUserIsVerified } from 'src/users/profile-verification.util';
import { generateReferralCode } from 'src/users/referral-code.util';
import { PushService } from 'src/push/push.service';
import { ApiException } from 'src/common/errors/api-exception';
import { HttpStatus } from '@nestjs/common';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(Country)
    private countryRepo: Repository<Country>,

    @InjectRepository(Language)
    private languageRepo: Repository<Language>,

    private filterService: FilterService, // 👈 add this
    private pushService: PushService,
  ) {}

  generateToken(user: any) {
    return this.jwtService.sign({
      id: user.id,
      tokenVersion: Number(user.tokenVersion || 0),
    });
  }

  toPublicUser(user: any) {
    const publicUser = { ...(user as any) };
    for (const field of [
      'passwordHash',
      'passwordSalt',
      'fcmTokens',
      'password',
      'admin_notes',
      'verified_by_admin_id',
      'systemRole',
    ]) {
      delete publicUser[field];
    }

    return publicUser;
  }

  async generateUniqueReferralCode() {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const referralCode = generateReferralCode();
      const existing = await this.userRepo.findOne({
        where: { referralCode },
        select: ['id'],
      });

      if (!existing) return referralCode;
    }

    throw new BadRequestException('Unable to generate referral code');
  }

  // ────────────────────────────────────────────────
  // CHECK USER BY PHONE
  // ────────────────────────────────────────────────
  async findUserByPhone(phone: string) {
    return this.userRepo.findOne({
      where: { phone },
      relations: ['country', 'language'],
    });
  }

  // ────────────────────────────────────────────────
  // CREATE USER IF NOT EXISTS
  // ────────────────────────────────────────────────
  async createOrGetUser(data: any) {
    const existing = await this.findUserByPhone(data.phone);
    if (existing) return existing;

    const countryId = Number(data.country);
    const languageId = Number(data.language);

    if (!Number.isInteger(countryId) || countryId <= 0) {
      throw new BadRequestException('countryId must be a valid ID');
    }

    if (!Number.isInteger(languageId) || languageId <= 0) {
      throw new BadRequestException('languageId must be a valid ID');
    }

    const country = await this.countryRepo.findOne({
      where: { id: countryId },
    });

    const language = await this.languageRepo.findOne({
      where: { id: languageId },
    });

    if (!country) throw new BadRequestException('Country not found');
    if (!language) throw new BadRequestException('Language not found');

    // 🔥 Get top 9 filters by job availability
    const defaultFilterPreferences =
      await this.filterService.getTopFiltersByJobs(9);

    const {
      country: _country,
      language: _language,
      countryId: _countryId,
      languageId: _languageId,
      photoUri: _photoUri,
      ...userData
    } = data;

    const user = this.userRepo.create({
      ...userData,
      country,
      language,
      isBanned: false,
      referralCode: data.referralCode || (await this.generateUniqueReferralCode()),
      isVerified: computeUserIsVerified(userData as any),
      filter_preferences: defaultFilterPreferences, // ✅ AUTO SET
    });

    return this.userRepo.save(user);
  }

  async createSocialUser(data: {
    phone: string;
    firstName: string;
    lastName?: string;
    email?: string;
    profilePhoto?: string;
  }) {
    const existing = await this.findUserByPhone(data.phone);
    if (existing) return existing;
    const filterPreferences = await this.filterService.getTopFiltersByJobs(9);
    return this.userRepo.save(
      this.userRepo.create({
        phone: data.phone,
        firstName: data.firstName || 'JobsLoot',
        lastName: data.lastName || 'User',
        email: data.email || null,
        profile_photo: data.profilePhoto || null,
        passwordHash: null,
        passwordSalt: null,
        phoneVerifiedAt: new Date(),
        isVerified: false,
        isBanned: false,
        referralCode: await this.generateUniqueReferralCode(),
        filter_preferences: filterPreferences,
      }),
    );
  }

  async findUserById(userId: number) {
    return this.userRepo.findOne({
      where: { id: userId },
      relations: ['country', 'language'],
    });
  }

  async validateRegistrationRelations(countryId: number, languageId: number) {
    const [country, language] = await Promise.all([
      this.countryRepo.findOne({ where: { id: countryId } }),
      this.languageRepo.findOne({ where: { id: languageId } }),
    ]);

    if (!country) throw new BadRequestException('Country not found');
    if (!language) throw new BadRequestException('Language not found');
  }

  // ────────────────────────────────────────────────
  // PASSWORD HELPERS
  // ────────────────────────────────────────────────
  hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return { salt, hash };
  }

  validatePassword(password: string, storedHash: string, salt: string) {
    if (!storedHash || !salt) return false;
    const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === storedHash;
  }

  // ────────────────────────────────────────────────
  // LOGIN / VALIDATE USER
  // ────────────────────────────────────────────────
  async validateUser(phone: string, password: string) {
    const user = await this.findUserByPhone(phone);
    if (!user) throw new UnauthorizedException('Invalid phone or password');

    const isValid = this.validatePassword(
      password,
      user.passwordHash,
      user.passwordSalt,
    );

    if (!isValid) throw new UnauthorizedException('Invalid phone or password');

    if (user.isBanned) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        'AUTH_ACCOUNT_BANNED',
        'Your account is blocked',
      );
    }
    if (user.deletedAt) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        'AUTH_ACCOUNT_DELETED',
        'This account is no longer available',
      );
    }
    if (user.deletionScheduledAt) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        'ACCOUNT_PENDING_DELETION',
        'Account deletion is pending; recover the account to continue',
        { scheduledDeletionAt: user.deletionScheduledAt },
      );
    }

    return user;
  }

  // ────────────────────────────────────────────────
  // RESET PASSWORD (forgot-password)
  // ────────────────────────────────────────────────
  async resetPassword(phone: string, salt: string, hash: string) {
    const user = await this.findUserByPhone(phone);
    if (!user) throw new UnauthorizedException('User not found');

    user.passwordSalt = salt;
    user.passwordHash = hash;
    user.tokenVersion = Number(user.tokenVersion || 0) + 1;

    return this.userRepo.save(user);
  }

  async validateUserByIdAndPassword(userId: number, password: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['country', 'language'],
    });
    if (!user) throw new UnauthorizedException('Invalid user session');

    const isValid = this.validatePassword(
      password,
      user.passwordHash,
      user.passwordSalt,
    );

    if (!isValid) throw new UnauthorizedException('Invalid password');
    if (user.isBanned)
      throw new UnauthorizedException('Your account is blocked!');

    return user;
  }

  async changePassword(userId: number, newPassword: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['country', 'language'],
    });
    if (!user) throw new UnauthorizedException('Invalid user session');

    const { salt, hash } = this.hashPassword(newPassword);
    user.passwordSalt = salt;
    user.passwordHash = hash;
    user.tokenVersion = Number(user.tokenVersion || 0) + 1;

    return this.userRepo.save(user);
  }

  async changePhone(userId: number, newPhone: string) {
    const existing = await this.findUserByPhone(newPhone);
    if (existing && existing.id !== userId) {
      throw new BadRequestException('Phone already registered');
    }

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['country', 'language'],
    });
    if (!user) throw new UnauthorizedException('Invalid user session');

    user.phone = newPhone;
    user.phoneVerifiedAt = new Date();
    user.isVerified = computeUserIsVerified(user);

    return this.userRepo.save(user);
  }

  async incrementTokenVersion(userId: number) {
    await this.userRepo.increment({ id: userId }, 'tokenVersion', 1);
    return this.findUserById(userId);
  }

  async attachFcmToken(
    userId: number,
    fcmToken: string,
    device: {
      installationId?: string;
      platform?: 'ios' | 'android';
      appVersion?: string;
      locale?: string;
    } = {},
  ) {
    const installationId =
      device.installationId || `legacy-fcm:${fcmToken.slice(-40)}`;
    await this.pushService.upsertDevice(userId, {
      installationId,
      token: fcmToken,
      platform: device.platform || 'android',
      appVersion: device.appVersion,
      locale: device.locale,
    });
  }



}
