import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { FirebaseService } from 'src/firebase/firebase.service';
import {
  USERNAME_COOLDOWN_DAYS,
  USERNAME_COOLDOWN_MS,
  USERNAME_PATTERN,
  USERNAME_RULES_TEXT,
  normalizeUsername,
} from './username.util';
import {
  NotificationSettings,
  resolveNotificationSettings,
} from 'src/notification/notification-settings';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private firebaseService: FirebaseService, // 👈 add this
  ) {}

  async getUserById(id: number) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['country', 'language', 'cityEntity'],
    });

    if (!user) throw new NotFoundException('User not found');

    return user;
  }

  async updateUser(id: number, data: any) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['country', 'language', 'cityEntity'],
    });
    if (!user) throw new NotFoundException('User not found');

    Object.assign(user, data);

    return this.userRepo.save(user);
  }

  async findUsersByIds(ids: number[]) {
    return this.userRepo.find({
      where: { id: In(ids) },
    });
  }

  async getUserPreference(userId: number) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    return { data: user.filter_preferences ?? [] };
  }

  async getNotificationSettings(userId: number): Promise<NotificationSettings> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'notification_settings'],
    });
    if (!user) throw new NotFoundException('User not found');

    return resolveNotificationSettings(user.notification_settings);
  }

  async updateNotificationSettings(
    userId: number,
    patch: Partial<NotificationSettings>,
  ): Promise<NotificationSettings> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'email', 'notification_settings'],
    });
    if (!user) throw new NotFoundException('User not found');

    if (patch.email === true && !user.email) {
      throw new BadRequestException(
        'Add an email to your account before enabling email notifications',
      );
    }

    const next = {
      ...resolveNotificationSettings(user.notification_settings),
      ...patch,
    };

    await this.userRepo.update({ id: userId }, { notification_settings: next });
    return next;
  }

  // ────────────────────────────────────────────────
  // USERNAME
  // ────────────────────────────────────────────────

  /** When the user may change the username next (null = right now) */
  private nextUsernameChangeAt(changedAt: Date | null): Date | null {
    if (!changedAt) return null;
    const next = new Date(new Date(changedAt).getTime() + USERNAME_COOLDOWN_MS);
    return next.getTime() > Date.now() ? next : null;
  }

  async getUsernameInfo(userId: number) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'username', 'usernameChangedAt'],
    });
    if (!user) throw new NotFoundException('User not found');

    const next = this.nextUsernameChangeAt(user.usernameChangedAt);
    return {
      username: user.username,
      canChangeNow: !next,
      nextChangeAt: next,
      cooldownDays: USERNAME_COOLDOWN_DAYS,
    };
  }

  async checkUsernameAvailable(userId: number, raw: string) {
    const username = normalizeUsername(raw);
    if (!USERNAME_PATTERN.test(username)) {
      return {
        username,
        valid: false,
        available: false,
        reason: USERNAME_RULES_TEXT,
      };
    }

    const owner = await this.userRepo.findOne({
      where: { username },
      select: ['id'],
    });
    if (owner?.id === userId) {
      return {
        username,
        valid: true,
        available: false,
        reason: 'This is already your username',
      };
    }
    if (owner) {
      return {
        username,
        valid: true,
        available: false,
        reason: 'Username already taken',
      };
    }
    return { username, valid: true, available: true };
  }

  /**
   * First change is instant; after that one change every 7 days
   * (counted from the last change the user made themselves).
   */
  async changeUsername(userId: number, raw: string) {
    const username = normalizeUsername(raw);
    if (!USERNAME_PATTERN.test(username)) {
      throw new BadRequestException(USERNAME_RULES_TEXT);
    }

    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'username', 'usernameChangedAt'],
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.username === username) {
      throw new BadRequestException('This is already your username');
    }

    const next = this.nextUsernameChangeAt(user.usernameChangedAt);
    if (next) {
      throw new BadRequestException(
        `You can change your username once every ${USERNAME_COOLDOWN_DAYS} days. Next change available at ${next.toISOString()}`,
      );
    }

    const taken = await this.userRepo.findOne({
      where: { username },
      select: ['id'],
    });
    if (taken) throw new ConflictException('Username already taken');

    const changedAt = new Date();
    try {
      await this.userRepo.update(
        { id: userId },
        { username, usernameChangedAt: changedAt },
      );
    } catch (err: any) {
      // two people grabbing the same name at once: the unique index wins
      if (err?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Username already taken');
      }
      throw err;
    }

    return {
      message: 'Username updated',
      username,
      canChangeNow: false,
      nextChangeAt: new Date(changedAt.getTime() + USERNAME_COOLDOWN_MS),
      cooldownDays: USERNAME_COOLDOWN_DAYS,
    };
  }

  async updateUserFilterPreferences(userId: number, newFilters: number[]) {
    const unique = [...new Set(newFilters.map(Number))].filter(
      (n) => !Number.isNaN(n) && n > 0,
    );

    if (unique.length < 4) {
      throw new BadRequestException('Select at least 4 filter preferences');
    }
    if (unique.length > 30) {
      throw new BadRequestException(
        'You can select at most 30 filter preferences',
      );
    }

    const user = await this.userRepo
      .createQueryBuilder('u')
      .select(['u.id', 'u.filter_preferences', 'u.fcmTokens'])
      .where('u.id = :userId', { userId })
      .getOne();

    if (!user) return;

    const oldFilters = user.filter_preferences || [];

    // update in DB
    user.filter_preferences = unique;
    await this.userRepo.save(user);

    // sync Firebase topics for all user's tokens
    for (const token of user.fcmTokens || []) {
      await this.firebaseService.updateFilterSubscriptions(
        token,
        oldFilters,
        unique,
      );
    }

    return user;
  }
}
