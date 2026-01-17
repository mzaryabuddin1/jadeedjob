import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { pbkdf2Sync, randomBytes } from 'crypto';
import { User } from 'src/users/entities/user.entity';
import { Country } from 'src/country/entities/country.entity';
import { Language } from 'twilio/lib/twiml/VoiceResponse';
import { FilterService } from 'src/filter/filter.service';
import { FirebaseService } from 'src/firebase/firebase.service';

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
    private firebaseService: FirebaseService, // 👈 add this
  ) {}

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
