import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { pbkdf2Sync, randomBytes } from 'crypto';
import { User } from 'src/users/entities/user.entity';
import { Country } from 'src/country/entities/country.entity';
import { Language } from 'src/language/entities/language.entity';
import { City } from 'src/city/entities/city.entity';
import { FilterService } from 'src/filter/filter.service';
import { FirebaseService } from 'src/firebase/firebase.service';
import { GoogleAuthService } from './google-auth.service';
import { FacebookAuthService } from './facebook-auth.service';

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

    @InjectRepository(City)
    private cityRepo: Repository<City>,

    private filterService: FilterService,
    private firebaseService: FirebaseService,
    private googleAuthService: GoogleAuthService,
    private facebookAuthService: FacebookAuthService,
  ) {}

  /** KYC is complete when the account has a verified phone number */
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

  generateToken(user: any) {
    return this.jwtService.sign({ id: user.id });
  }

  async findUserById(id: number) {
    return this.userRepo.findOne({
      where: { id },
      relations: ['country', 'language', 'cityEntity'],
    });
  }

  async findUserByPhone(phone: string) {
    return this.userRepo.findOne({
      where: { phone },
      relations: ['country', 'language', 'cityEntity'],
    });
  }

  async findUserByGoogleId(googleId: string) {
    return this.userRepo.findOne({
      where: { googleId },
      relations: ['country', 'language', 'cityEntity'],
    });
  }

  async findUserByFacebookId(facebookId: string) {
    return this.userRepo.findOne({
      where: { facebookId },
      relations: ['country', 'language', 'cityEntity'],
    });
  }

  async findUserByEmail(email: string) {
    return this.userRepo.findOne({
      where: { email },
      relations: ['country', 'language', 'cityEntity'],
    });
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

  /** Ensure email is not used by another account */
  async assertEmailAvailable(email: string, excludeUserId?: number) {
    const existing = await this.userRepo.findOne({
      where: excludeUserId
        ? { email, id: Not(excludeUserId) }
        : { email },
    });
    if (existing) {
      throw new BadRequestException('Email already registered');
    }
  }

  // ────────────────────────────────────────────────
  // CREATE USER IF NOT EXISTS (phone registration)
  // ────────────────────────────────────────────────
  async createOrGetUser(data: any) {
    const existing = await this.findUserByPhone(data.phone);
    if (existing) return existing;

    if (data.email) {
      await this.assertEmailAvailable(data.email);
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

  // ────────────────────────────────────────────────
  // PASSWORD HELPERS
  // ────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────
  // UPDATE EMAIL (after OTP verify)
  // ────────────────────────────────────────────────
  async updateUserEmail(userId: number, email: string) {
    await this.assertEmailAvailable(email, userId);
    const user = await this.findUserById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    user.email = email;
    return this.userRepo.save(user);
  }

  // ────────────────────────────────────────────────
  // COMPLETE KYC — attach phone (+ optional country/language/city)
  // ────────────────────────────────────────────────
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

    return this.userRepo.save(user);
  }

  // ────────────────────────────────────────────────
  // GOOGLE LOGIN / SIGNUP
  // ────────────────────────────────────────────────
  async loginWithGoogle(
    idToken: string,
    options?: { fcmToken?: string; country?: number; language?: number },
  ) {
    const profile = await this.googleAuthService.getProfileFromToken(idToken);

    let user = await this.findUserByGoogleId(profile.providerId);

    if (!user && profile.email) {
      user = await this.findUserByEmail(profile.email);
    }

    let isNewUser = false;

    if (user) {
      user.googleId = profile.providerId;
      user.authProvider = 'google';
      user.email = profile.email ?? user.email;
      user.firstName = profile.firstName;
      user.lastName = profile.lastName;
      if (profile.picture) user.profile_photo = profile.picture;
      user.isVerified = true;
      user = await this.userRepo.save(user);
    } else {
      isNewUser = true;
      const { country, language } = await this.resolveCountryLanguage(
        options?.country,
        options?.language,
      );

      user = await this.userRepo.save(
        this.userRepo.create({
          googleId: profile.providerId,
          authProvider: 'google',
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          profile_photo: profile.picture,
          phone: null,
          passwordHash: null,
          passwordSalt: null,
          country,
          language,
          isVerified: true,
          isBanned: false,
          kyc_status: 'pending',
          filter_preferences: await this.filterService.getTopFiltersByJobs(9),
        }),
      );
    }

    user = await this.findUserByGoogleId(profile.providerId);

    if (!user) {
      throw new UnauthorizedException('Could not save Google user');
    }

    if (user.isBanned) {
      throw new UnauthorizedException('Your account is blocked!');
    }

    if (options?.fcmToken) {
      await this.attachFcmToken(user.id, options.fcmToken);
      user = (await this.findUserByGoogleId(profile.providerId))!;
    }

    return this.authResponse(user, {
      message: isNewUser ? 'Signup successful' : 'Login successful',
      isNewUser,
    });
  }

  // ────────────────────────────────────────────────
  // FACEBOOK LOGIN / SIGNUP
  // ────────────────────────────────────────────────
  async loginWithFacebook(
    accessToken: string,
    options?: { fcmToken?: string; country?: number; language?: number },
  ) {
    const profile =
      await this.facebookAuthService.getProfileFromToken(accessToken);

    let user = await this.findUserByFacebookId(profile.providerId);

    if (!user && profile.email) {
      user = await this.findUserByEmail(profile.email);
    }

    let isNewUser = false;

    if (user) {
      user.facebookId = profile.providerId;
      user.authProvider = 'facebook';
      user.email = profile.email ?? user.email;
      user.firstName = profile.firstName;
      user.lastName = profile.lastName;
      if (profile.picture) user.profile_photo = profile.picture;
      user.isVerified = true;
      user = await this.userRepo.save(user);
    } else {
      isNewUser = true;
      const { country, language } = await this.resolveCountryLanguage(
        options?.country,
        options?.language,
      );

      user = await this.userRepo.save(
        this.userRepo.create({
          facebookId: profile.providerId,
          authProvider: 'facebook',
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          profile_photo: profile.picture,
          phone: null,
          passwordHash: null,
          passwordSalt: null,
          country,
          language,
          isVerified: true,
          isBanned: false,
          kyc_status: 'pending',
          filter_preferences: await this.filterService.getTopFiltersByJobs(9),
        }),
      );
    }

    user = await this.findUserByFacebookId(profile.providerId);

    if (!user) {
      throw new UnauthorizedException('Could not save Facebook user');
    }

    if (user.isBanned) {
      throw new UnauthorizedException('Your account is blocked!');
    }

    if (options?.fcmToken) {
      await this.attachFcmToken(user.id, options.fcmToken);
      user = (await this.findUserByFacebookId(profile.providerId))!;
    }

    return this.authResponse(user, {
      message: isNewUser ? 'Signup successful' : 'Login successful',
      isNewUser,
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
