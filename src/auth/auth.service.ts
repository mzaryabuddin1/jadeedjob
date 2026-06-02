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
import { FirebaseService } from 'src/firebase/firebase.service';
import { GoogleAuthService } from './google-auth.service';

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

    private filterService: FilterService,
    private firebaseService: FirebaseService,
    private googleAuthService: GoogleAuthService,
  ) {}

  toPublicUser(user: User) {
    const { passwordHash, passwordSalt, ...publicUser } = user as User & {
      passwordHash?: string;
      passwordSalt?: string;
    };
    return publicUser;
  }

  generateToken(user: any) {
    return this.jwtService.sign({ id: user.id });
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

  async findUserByGoogleId(googleId: string) {
    return this.userRepo.findOne({
      where: { googleId },
      relations: ['country', 'language'],
    });
  }

  async findUserByEmail(email: string) {
    return this.userRepo.findOne({
      where: { email },
      relations: ['country', 'language'],
    });
  }

  private async resolveCountryLanguage(countryId?: number, languageId?: number) {
    const country = countryId
      ? await this.countryRepo.findOne({ where: { id: countryId } })
      : await this.countryRepo.findOne({ where: {}, order: { id: 'ASC' } });

    const language = languageId
      ? await this.languageRepo.findOne({ where: { id: languageId } })
      : await this.languageRepo.findOne({ where: {}, order: { id: 'ASC' } });

    return { country: country ?? null, language: language ?? null };
  }

  // ────────────────────────────────────────────────
  // CREATE USER IF NOT EXISTS
  // ────────────────────────────────────────────────
  async createOrGetUser(data: any) {
    const existing = await this.findUserByPhone(data.phone);
    if (existing) return existing;

    const country = await this.countryRepo.findOne({
      where: { id: Number(data.country) },
    });

    const language = await this.languageRepo.findOne({
      where: { id: Number(data.language) },
    });

    // 🔥 Get top 9 filters by job availability
    const defaultFilterPreferences =
      await this.filterService.getTopFiltersByJobs(9);

    const user = this.userRepo.create({
      ...data,
      country,
      language,
      isBanned: false,
      filter_preferences: defaultFilterPreferences, // ✅ AUTO SET
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

  // ────────────────────────────────────────────────
  // LOGIN / VALIDATE USER
  // ────────────────────────────────────────────────
  async validateUser(phone: string, password: string) {
    const user = await this.findUserByPhone(phone);
    if (!user) throw new UnauthorizedException('Invalid phone or password');

    if (!user.passwordHash || !user.passwordSalt) {
      throw new UnauthorizedException(
        'This account uses Google sign-in. Please log in with Google.',
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

  // ────────────────────────────────────────────────
  // RESET PASSWORD (forgot-password)
  // ────────────────────────────────────────────────
  async resetPassword(phone: string, salt: string, hash: string) {
    await this.userRepo.update(
      { phone },
      { passwordSalt: salt, passwordHash: hash },
    );
  }

  // ────────────────────────────────────────────────
  // GOOGLE LOGIN / SIGNUP — one endpoint, saves user row
  // ────────────────────────────────────────────────
  async loginWithGoogle(
    idToken: string,
    options?: { fcmToken?: string; country?: number; language?: number },
  ) {
    const profile = await this.googleAuthService.getProfileFromToken(idToken);

    // 1) Existing Google user
    let user = await this.findUserByGoogleId(profile.providerId);

    // 2) Same email already registered (link Google to that account)
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

    return {
      message: isNewUser ? 'Signup successful' : 'Login successful',
      isNewUser,
      access_token: this.generateToken(user),
      user: this.toPublicUser(user),
    };
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

    // 🔥 Subscribe this token to current filters
    const filters = user.filter_preferences || [];
    if (filters.length) {
      await this.firebaseService.subscribeTokenToFilters(fcmToken, filters);
    }
  }



}
