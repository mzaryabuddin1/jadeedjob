import {
  BadRequestException,
  ConflictException,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { pbkdf2Sync, randomBytes } from 'crypto';
import { User } from 'src/users/entities/user.entity';
import {
  AuthProviderType,
  UserAuthIdentity,
} from 'src/users/entities/user-auth-identity.entity';
import { Country } from 'src/country/entities/country.entity';
import { Language } from 'src/language/entities/language.entity';
import { City } from 'src/city/entities/city.entity';
import { FilterService } from 'src/filter/filter.service';
import { FirebaseService } from 'src/firebase/firebase.service';
import { GoogleAuthService } from './google-auth.service';
import { FacebookAuthService } from './facebook-auth.service';

/** Short-lived pending Google/Facebook signup (no DB user yet) */
export type PendingSocialSignup = {
  purpose: 'kyc_pending';
  provider: AuthProviderType;
  providerId: string;
  email: string | null;
  firstName: string;
  lastName: string;
  picture: string | null;
  country?: number;
  language?: number;
  fcmToken?: string;
};

/** After phone OTP — confirm linking an *additional* social identity */
export type PendingLinkConfirmation = {
  purpose: 'link_confirm';
  userId: number;
  provider: AuthProviderType;
  providerId: string;
  providerEmail: string | null;
  firstName: string;
  lastName: string;
  picture: string | null;
  fcmToken?: string;
};

export type SocialKycResult =
  | { status: 'ok'; user: User; isNewUser: boolean }
  | {
      status: 'needs_confirmation';
      user: User;
      link_token: string;
      message: string;
      existing_providers: AuthProviderType[];
    };

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private jwtService: JwtService,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(UserAuthIdentity)
    private identityRepo: Repository<UserAuthIdentity>,

    @InjectRepository(Country)
    private countryRepo: Repository<Country>,

    @InjectRepository(Language)
    private languageRepo: Repository<Language>,

    @InjectRepository(City)
    private cityRepo: Repository<City>,

    private filterService: FilterService,
    private firebaseService: FirebaseService,
    private googleAuthService: GoogleAuthService,
    private facebookAuthService: FacebookAuthService,
  ) {}

  /** Backfill legacy googleId / facebookId into user_auth_identities */
  async onModuleInit() {
    try {
      await this.migrateLegacyIdentities();
    } catch (err) {
      console.warn(
        '[AuthService] identity migration skipped:',
        err instanceof Error ? err.message : err,
      );
    }
  }

  private async migrateLegacyIdentities() {
    const users = await this.userRepo.find({
      select: ['id', 'googleId', 'facebookId', 'email'],
    });

    for (const user of users) {
      if (user.googleId) {
        await this.ensureIdentityRow(
          user.id,
          'google',
          user.googleId,
          user.email,
        );
      }
      if (user.facebookId) {
        await this.ensureIdentityRow(
          user.id,
          'facebook',
          user.facebookId,
          user.email,
        );
      }
    }
  }

  private async ensureIdentityRow(
    userId: number,
    provider: AuthProviderType,
    providerId: string,
    providerEmail?: string | null,
  ) {
    const existing = await this.identityRepo.findOne({
      where: { provider, providerId },
    });
    if (existing) return existing;

    // Use insert() so TypeORM does not null the FK via an unloaded `user` relation
    await this.identityRepo.insert({
      userId,
      provider,
      providerId,
      providerEmail: providerEmail
        ? String(providerEmail).trim().toLowerCase()
        : null,
    });

    return this.identityRepo.findOneOrFail({
      where: { provider, providerId },
    });
  }

  isKycComplete(user: User | null | undefined): boolean {
    return !!(user?.phone && String(user.phone).trim());
  }

  toPublicUser(user: User) {
    const { passwordHash, passwordSalt, ...publicUser } = user as User & {
      passwordHash?: string;
      passwordSalt?: string;
    };
    return {
      ...publicUser,
      kyc_complete: this.isKycComplete(user),
    };
  }

  authResponse(
    user: User,
    extras?: { message?: string; isNewUser?: boolean },
  ) {
    return {
      ...(extras?.message ? { message: extras.message } : {}),
      ...(extras?.isNewUser !== undefined
        ? { isNewUser: extras.isNewUser }
        : {}),
      access_token: this.generateToken(user),
      kyc_complete: this.isKycComplete(user),
      user: this.toPublicUser(user),
    };
  }

  pendingKycResponse(
    pending: PendingSocialSignup,
    extras?: {
      emailAlreadyRegistered?: boolean;
      hintPhone?: string | null;
    },
  ) {
    const kyc_token = this.generateKycToken(pending);
    const emailTaken = !!extras?.emailAlreadyRegistered;

    return {
      message: emailTaken
        ? 'This Google email is already on a phone account. Enter that same phone and verify OTP to link Google (we do not auto-login by email).'
        : 'Complete phone verification to continue',
      kyc_complete: false,
      // False when email already belongs to a phone user — OTP will link, not create
      isNewUser: !emailTaken,
      email_already_registered: emailTaken,
      ...(emailTaken && extras?.hintPhone
        ? {
            hint: `Use phone ${extras.hintPhone} (same as your registered account) then Verify OTP to link this Google login.`,
            // Mask middle digits for UI convenience without full leak? User asked for clarity in test — keep full for now on API; mobile can mask
            registered_phone_hint: extras.hintPhone,
          }
        : {}),
      kyc_token,
      profile: {
        provider: pending.provider,
        email: pending.email,
        firstName: pending.firstName,
        lastName: pending.lastName,
        picture: pending.picture,
      },
    };
  }

  private maskPhone(phone: string): string {
    const p = String(phone);
    if (p.length < 6) return '****';
    return `${p.slice(0, 4)}****${p.slice(-3)}`;
  }

  /** If social email already on a user, KYC must use that phone to link (never auto-login by email). */
  private async pendingSocialWithEmailHint(pending: PendingSocialSignup) {
    if (!pending.email) {
      return this.pendingKycResponse(pending);
    }

    const normalized = String(pending.email).trim().toLowerCase();
    const byEmail = await this.userRepo
      .createQueryBuilder('u')
      .where('LOWER(u.email) = :email', { email: normalized })
      .getOne();

    if (byEmail?.phone) {
      return this.pendingKycResponse(pending, {
        emailAlreadyRegistered: true,
        hintPhone: this.maskPhone(byEmail.phone),
      });
    }

    // Email only on another identity — still require OTP; do not expose which phone
    const linked = await this.identityRepo
      .createQueryBuilder('i')
      .where('LOWER(i.providerEmail) = :email', { email: normalized })
      .getOne();

    if (linked) {
      return this.pendingKycResponse(pending, {
        emailAlreadyRegistered: true,
        hintPhone: null,
      });
    }

    return this.pendingKycResponse(pending);
  }

  generateToken(user: any) {
    return this.jwtService.sign({ id: user.id });
  }

  /** Dev-only snapshot: users + linked social identities for the auth test page */
  async listDebugAccounts() {
    const users = await this.userRepo.find({
      relations: ['authIdentities', 'country', 'language', 'cityEntity'],
      order: { id: 'ASC' },
    });

    return users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      email: u.email,
      authProvider: u.authProvider,
      googleId: u.googleId,
      facebookId: u.facebookId,
      kyc_complete: this.isKycComplete(u),
      kyc_status: u.kyc_status,
      isVerified: u.isVerified,
      countryId: u.country?.id ?? null,
      languageId: u.language?.id ?? null,
      cityId: u.cityEntity?.id ?? null,
      createdAt: u.createdAt,
      identities: (u.authIdentities || []).map((i) => ({
        id: i.id,
        provider: i.provider,
        providerId: i.providerId,
        providerEmail: i.providerEmail,
        linkedAt: i.linkedAt,
      })),
    }));
  }

  /** Dev-only: delete a user (identities cascade via FK) */
  async deleteDebugAccount(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    await this.identityRepo.delete({ userId });
    await this.userRepo.delete(userId);
    return { deleted: true, id: userId };
  }

  generateKycToken(pending: PendingSocialSignup): string {
    return this.jwtService.sign(pending, { expiresIn: '30m' });
  }

  verifyKycToken(token: string): PendingSocialSignup {
    try {
      const payload = this.jwtService.verify(token) as PendingSocialSignup;
      if (payload?.purpose !== 'kyc_pending' || !payload.providerId) {
        throw new UnauthorizedException('Invalid KYC token');
      }
      return payload;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('KYC token expired or invalid');
    }
  }

  generateLinkToken(payload: PendingLinkConfirmation): string {
    return this.jwtService.sign(payload, { expiresIn: '15m' });
  }

  verifyLinkToken(token: string): PendingLinkConfirmation {
    try {
      const payload = this.jwtService.verify(token) as PendingLinkConfirmation;
      if (payload?.purpose !== 'link_confirm' || !payload.userId) {
        throw new UnauthorizedException('Invalid link token');
      }
      return payload;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Link token expired or invalid');
    }
  }

  tryGetUserIdFromAuthHeader(authHeader?: string): number | null {
    if (!authHeader?.startsWith('Bearer ')) return null;
    try {
      const decoded = this.jwtService.verify(authHeader.slice(7).trim()) as {
        id?: number;
      };
      return decoded?.id ?? null;
    } catch {
      return null;
    }
  }

  async findUserById(id: number) {
    return this.userRepo.findOne({
      where: { id },
      relations: ['country', 'language', 'cityEntity', 'authIdentities'],
    });
  }

  async findUserByPhone(phone: string) {
    return this.userRepo.findOne({
      where: { phone },
      relations: ['country', 'language', 'cityEntity', 'authIdentities'],
    });
  }

  async findUserByEmail(email: string) {
    return this.userRepo.findOne({
      where: { email },
      relations: ['country', 'language', 'cityEntity', 'authIdentities'],
    });
  }

  /** Resolve user by linked identity (table + legacy columns). Never by email. */
  async findUserByProvider(provider: AuthProviderType, providerId: string) {
    const identity = await this.identityRepo.findOne({
      where: { provider, providerId },
    });
    if (identity) {
      return this.findUserById(identity.userId);
    }

    // Legacy fallback
    if (provider === 'google') {
      return this.userRepo.findOne({
        where: { googleId: providerId },
        relations: ['country', 'language', 'cityEntity', 'authIdentities'],
      });
    }
    return this.userRepo.findOne({
      where: { facebookId: providerId },
      relations: ['country', 'language', 'cityEntity', 'authIdentities'],
    });
  }

  async listProviderTypesForUser(
    userId: number,
  ): Promise<AuthProviderType[]> {
    const rows = await this.identityRepo.find({
      where: { userId },
      select: ['provider'],
    });
    return [...new Set(rows.map((r) => r.provider))];
  }

  private async resolveCountryLanguage(
    countryId?: number,
    languageId?: number,
  ) {
    const country = countryId
      ? await this.countryRepo.findOne({ where: { id: countryId } })
      : await this.countryRepo.findOne({ where: {}, order: { id: 'ASC' } });

    const language = languageId
      ? await this.languageRepo.findOne({ where: { id: languageId } })
      : await this.languageRepo.findOne({ where: {}, order: { id: 'ASC' } });

    return { country: country ?? null, language: language ?? null };
  }

  private async resolveCity(cityId?: number) {
    if (!cityId) return null;
    const city = await this.cityRepo.findOne({ where: { id: Number(cityId) } });
    if (!city) throw new BadRequestException('Invalid city id');
    return city;
  }

  async assertEmailAvailable(email: string, excludeUserId?: number) {
    const normalized = String(email).trim().toLowerCase();
    if (!normalized) return;

    const existing = await this.userRepo
      .createQueryBuilder('u')
      .where('LOWER(u.email) = :email', { email: normalized })
      .andWhere(excludeUserId ? 'u.id != :excludeUserId' : '1=1', {
        excludeUserId,
      })
      .getOne();
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    // Also block emails already linked via Google/Facebook on another account
    const linkedQb = this.identityRepo
      .createQueryBuilder('i')
      .where('LOWER(i.providerEmail) = :email', { email: normalized });
    if (excludeUserId) {
      linkedQb.andWhere('i.userId != :excludeUserId', { excludeUserId });
    }
    const linked = await linkedQb.getOne();
    if (linked) {
      throw new BadRequestException(
        'Email already linked to another account via Google/Facebook',
      );
    }
  }

  async createOrGetUser(data: any) {
    const existing = await this.findUserByPhone(data.phone);
    if (existing) return existing;

    if (data.email) {
      await this.assertEmailAvailable(data.email);
      data = { ...data, email: String(data.email).trim().toLowerCase() };
    }

    const {
      country: countryId,
      language: languageId,
      city: cityId,
      purpose: _purpose,
      ...rest
    } = data;

    const country = await this.countryRepo.findOne({
      where: { id: Number(countryId) },
    });
    if (!country) throw new BadRequestException('Invalid country id');

    const language = await this.languageRepo.findOne({
      where: { id: Number(languageId) },
    });
    if (!language) throw new BadRequestException('Invalid language id');

    const cityEntity = await this.resolveCity(
      cityId !== undefined && cityId !== null ? Number(cityId) : undefined,
    );

    const defaultFilterPreferences =
      await this.filterService.getTopFiltersByJobs(9);

    const user = this.userRepo.create({
      ...rest,
      country,
      language,
      cityEntity,
      isBanned: false,
      filter_preferences: defaultFilterPreferences,
    });

    return this.userRepo.save(user);
  }

  hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return { salt, hash };
  }

  validatePassword(password: string, storedHash: string, salt: string) {
    const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === storedHash;
  }

  async validateUser(phone: string, password: string) {
    const user = await this.findUserByPhone(phone);
    if (!user) throw new UnauthorizedException('Invalid phone or password');

    if (!user.passwordHash || !user.passwordSalt) {
      const hint =
        user.authProvider === 'facebook'
          ? 'Facebook'
          : user.authProvider === 'google'
            ? 'Google'
            : 'social';
      throw new UnauthorizedException(
        `This account uses ${hint} sign-in. Please log in with ${hint}.`,
      );
    }

    const isValid = this.validatePassword(
      password,
      user.passwordHash,
      user.passwordSalt,
    );

    if (!isValid) throw new UnauthorizedException('Invalid phone or password');

    if (user.isBanned)
      throw new UnauthorizedException('Your account is blocked!');

    return user;
  }

  async resetPassword(phone: string, salt: string, hash: string) {
    await this.userRepo.update(
      { phone },
      { passwordSalt: salt, passwordHash: hash },
    );
  }

  async updateUserEmail(userId: number, email: string) {
    await this.assertEmailAvailable(email, userId);
    const user = await this.findUserById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    user.email = email;
    return this.userRepo.save(user);
  }

  async completeKyc(
    userId: number,
    data: {
      phone: string;
      country?: number;
      language?: number;
      city?: number;
    },
  ) {
    const phoneTaken = await this.findUserByPhone(data.phone);
    if (phoneTaken && phoneTaken.id !== userId) {
      throw new BadRequestException('Phone already registered');
    }

    const user = await this.findUserById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    user.phone = data.phone;
    user.isVerified = true;
    user.kyc_status = 'phone_verified';

    if (data.country) {
      const country = await this.countryRepo.findOne({
        where: { id: Number(data.country) },
      });
      if (!country) throw new BadRequestException('Invalid country id');
      user.country = country;
    }

    if (data.language) {
      const language = await this.languageRepo.findOne({
        where: { id: Number(data.language) },
      });
      if (!language) throw new BadRequestException('Invalid language id');
      user.language = language;
    }

    if (data.city !== undefined && data.city !== null) {
      user.cityEntity = await this.resolveCity(Number(data.city));
    }

    // Detach collections so cascade/orphan logic cannot null related FKs
    delete (user as any).authIdentities;
    delete (user as any).work_experience;
    delete (user as any).education;
    delete (user as any).certifications;

    return this.userRepo.save(user);
  }

  /**
   * Link social identity to user without overwriting existing primary ids/emails.
   */
  async linkIdentityToUser(
    user: User,
    pending: {
      provider: AuthProviderType;
      providerId: string;
      email?: string | null;
      firstName?: string;
      lastName?: string;
      picture?: string | null;
    },
    options?: { forceAdditional?: boolean },
  ): Promise<SocialKycResult> {
    const ownedBy = await this.findUserByProvider(
      pending.provider,
      pending.providerId,
    );

    if (ownedBy && ownedBy.id !== user.id) {
      throw new ConflictException(
        `This ${pending.provider} account is already linked to another user`,
      );
    }

    if (ownedBy && ownedBy.id === user.id) {
      // Already linked — backfill primary mirrors if still empty (never overwrite)
      await this.applyPrimarySocialMirrors(user, pending);
      return {
        status: 'ok',
        user: (await this.findUserById(user.id))!,
        isNewUser: false,
      };
    }

    const existingOfProvider = await this.identityRepo.count({
      where: { userId: user.id, provider: pending.provider },
    });

    // Additional Google/Facebook on an account that already has one → confirm first
    if (existingOfProvider > 0 && !options?.forceAdditional) {
      const link_token = this.generateLinkToken({
        purpose: 'link_confirm',
        userId: user.id,
        provider: pending.provider,
        providerId: pending.providerId,
        providerEmail: pending.email ?? null,
        firstName: pending.firstName || user.firstName,
        lastName: pending.lastName || user.lastName,
        picture: pending.picture ?? null,
      });

      return {
        status: 'needs_confirmation',
        user,
        link_token,
        message: `This account already has a ${pending.provider} login. Confirm to link an additional ${pending.provider} account (existing email / primary ${pending.provider} will not be replaced).`,
        existing_providers: await this.listProviderTypesForUser(user.id),
      };
    }

    if (pending.email) {
      await this.assertEmailAvailable(pending.email, user.id);
    }

    await this.ensureIdentityRow(
      user.id,
      pending.provider,
      pending.providerId,
      pending.email,
    );

    // update() — avoid userRepo.save() which can null FK on stale authIdentities
    await this.applyPrimarySocialMirrors(user, pending);
    const fresh = (await this.findUserById(user.id))!;

    return { status: 'ok', user: fresh, isNewUser: false };
  }

  /** Patch primary googleId/facebookId/email/photo without cascading relations */
  private async applyPrimarySocialMirrors(
    user: User,
    pending: {
      provider: AuthProviderType;
      providerId: string;
      email?: string | null;
      picture?: string | null;
    },
  ) {
    const patch: Partial<User> = {};

    if (pending.provider === 'google' && !user.googleId) {
      patch.googleId = pending.providerId;
    }
    if (pending.provider === 'facebook' && !user.facebookId) {
      patch.facebookId = pending.providerId;
    }
    if (!user.email && pending.email) {
      try {
        await this.assertEmailAvailable(pending.email, user.id);
        patch.email = String(pending.email).trim().toLowerCase();
      } catch {
        // leave email empty — do not steal another account's email
      }
    }
    if (pending.picture && !user.profile_photo) {
      patch.profile_photo = pending.picture;
    }

    if (Object.keys(patch).length) {
      await this.userRepo.update(user.id, patch);
    }
  }

  async confirmLinkIdentity(linkToken: string) {
    const pending = this.verifyLinkToken(linkToken);
    const user = await this.findUserById(pending.userId);
    if (!user) throw new UnauthorizedException('User not found');
    if (user.isBanned) throw new UnauthorizedException('Your account is blocked!');

    const result = await this.linkIdentityToUser(
      user,
      {
        provider: pending.provider,
        providerId: pending.providerId,
        email: pending.providerEmail,
        firstName: pending.firstName,
        lastName: pending.lastName,
        picture: pending.picture,
      },
      { forceAdditional: true },
    );

    if (result.status !== 'ok') {
      throw new BadRequestException('Could not confirm link');
    }

    if (pending.fcmToken) {
      await this.attachFcmToken(result.user.id, pending.fcmToken);
    }

    return this.authResponse(result.user, {
      message: 'Social account linked successfully',
      isNewUser: false,
    });
  }

  /**
   * After phone OTP for social flow:
   * - phone exists → link (or ask confirmation for additional provider)
   * - phone new → create user + identity
   * Never auto-link by email alone.
   */
  async resolveSocialKyc(
    pending: PendingSocialSignup,
    data: {
      phone: string;
      country?: number;
      language?: number;
      city?: number;
      fcmToken?: string;
    },
  ): Promise<SocialKycResult> {
    // Social already belongs to someone?
    const byProvider = await this.findUserByProvider(
      pending.provider,
      pending.providerId,
    );

    const phoneUser = await this.findUserByPhone(data.phone);

    if (byProvider && phoneUser && byProvider.id !== phoneUser.id) {
      throw new ConflictException(
        `This ${pending.provider} account is linked to a different user than this phone`,
      );
    }

    if (byProvider && (!phoneUser || phoneUser.id === byProvider.id)) {
      // Same user completing KYC / re-login
      let user = await this.completeKyc(byProvider.id, data);
      await this.applyPrimarySocialMirrors(user, pending);
      if (data.fcmToken || pending.fcmToken) {
        await this.attachFcmToken(
          user.id,
          data.fcmToken || pending.fcmToken!,
        );
      }
      return {
        status: 'ok',
        user: (await this.findUserById(user.id))!,
        isNewUser: false,
      };
    }

    if (phoneUser) {
      // Phone account exists → secure link after OTP (ownership proven)
      const result = await this.linkIdentityToUser(phoneUser, pending);
      if (result.status === 'ok' && (data.fcmToken || pending.fcmToken)) {
        await this.attachFcmToken(
          result.user.id,
          data.fcmToken || pending.fcmToken!,
        );
        result.user = (await this.findUserById(result.user.id))!;
      }
      if (result.status === 'needs_confirmation') {
        // embed fcm on link token by regenerating
        result.link_token = this.generateLinkToken({
          purpose: 'link_confirm',
          userId: phoneUser.id,
          provider: pending.provider,
          providerId: pending.providerId,
          providerEmail: pending.email,
          firstName: pending.firstName,
          lastName: pending.lastName,
          picture: pending.picture,
          fcmToken: data.fcmToken || pending.fcmToken,
        });
      }
      return result;
    }

    // Brand new phone + social → create account
    const countryId = data.country ?? pending.country;
    const languageId = data.language ?? pending.language;
    const { country, language } = await this.resolveCountryLanguage(
      countryId,
      languageId,
    );
    const cityEntity = await this.resolveCity(
      data.city !== undefined && data.city !== null
        ? Number(data.city)
        : undefined,
    );

    if (pending.email) {
      try {
        await this.assertEmailAvailable(pending.email);
      } catch {
        throw new ConflictException(
          'This social email is already used by another account. Use a different phone or contact support.',
        );
      }
    }

    let user = await this.userRepo.save(
      this.userRepo.create({
        googleId: pending.provider === 'google' ? pending.providerId : null,
        facebookId:
          pending.provider === 'facebook' ? pending.providerId : null,
        authProvider: pending.provider,
        email: pending.email,
        firstName: pending.firstName,
        lastName: pending.lastName,
        profile_photo: pending.picture,
        phone: data.phone,
        passwordHash: null,
        passwordSalt: null,
        country,
        language,
        cityEntity,
        isVerified: true,
        isBanned: false,
        kyc_status: 'phone_verified',
        filter_preferences: await this.filterService.getTopFiltersByJobs(9),
      }),
    );

    await this.ensureIdentityRow(
      user.id,
      pending.provider,
      pending.providerId,
      pending.email,
    );

    const fcm = data.fcmToken || pending.fcmToken;
    if (fcm) {
      await this.attachFcmToken(user.id, fcm);
    }

    user = (await this.findUserById(user.id))!;
    return { status: 'ok', user, isNewUser: true };
  }

  private async finishSocialLogin(
    user: User,
    profile: {
      provider: AuthProviderType;
      providerId: string;
      email: string | null;
      firstName: string;
      lastName: string;
      picture: string | null;
    },
    fcmToken?: string,
  ) {
    await this.ensureIdentityRow(
      user.id,
      profile.provider,
      profile.providerId,
      profile.email,
    );

    let current = user;

    if (profile.picture && !current.profile_photo) {
      current.profile_photo = profile.picture;
      current = await this.userRepo.save(current);
    }

    if (current.isBanned) {
      throw new UnauthorizedException('Your account is blocked!');
    }

    if (fcmToken) {
      await this.attachFcmToken(current.id, fcmToken);
      current = (await this.findUserById(current.id))!;
    }

    return this.authResponse(current, {
      message: 'Login successful',
      isNewUser: false,
    });
  }

  async loginWithGoogle(
    idToken: string,
    options?: { fcmToken?: string; country?: number; language?: number },
  ) {
    const profile = await this.googleAuthService.getProfileFromToken(idToken);

    const user = await this.findUserByProvider('google', profile.providerId);

    if (user) {
      return this.finishSocialLogin(
        user,
        {
          provider: 'google',
          providerId: profile.providerId,
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          picture: profile.picture,
        },
        options?.fcmToken,
      );
    }

    // Never match by email alone — always verify phone via KYC
    return this.pendingSocialWithEmailHint({
      purpose: 'kyc_pending',
      provider: 'google',
      providerId: profile.providerId,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      picture: profile.picture,
      country: options?.country,
      language: options?.language,
      fcmToken: options?.fcmToken,
    });
  }

  async loginWithFacebook(
    accessToken: string,
    options?: { fcmToken?: string; country?: number; language?: number },
  ) {
    const profile =
      await this.facebookAuthService.getProfileFromToken(accessToken);

    const user = await this.findUserByProvider(
      'facebook',
      profile.providerId,
    );

    if (user) {
      return this.finishSocialLogin(
        user,
        {
          provider: 'facebook',
          providerId: profile.providerId,
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          picture: profile.picture,
        },
        options?.fcmToken,
      );
    }

    return this.pendingSocialWithEmailHint({
      purpose: 'kyc_pending',
      provider: 'facebook',
      providerId: profile.providerId,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      picture: profile.picture,
      country: options?.country,
      language: options?.language,
      fcmToken: options?.fcmToken,
    });
  }

  async attachFcmToken(userId: number, fcmToken: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'fcmTokens', 'filter_preferences'],
    });

    if (!user) return;

    const tokens = new Set(user.fcmTokens || []);
    tokens.add(fcmToken);

    user.fcmTokens = Array.from(tokens);
    await this.userRepo.save(user);

    const filters = user.filter_preferences || [];
    if (filters.length) {
      await this.firebaseService.subscribeTokenToFilters(fcmToken, filters);
    }
  }
}
