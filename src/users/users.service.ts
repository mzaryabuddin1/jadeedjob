import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { FirebaseService } from 'src/firebase/firebase.service';
import { Filter } from 'src/filter/entities/filter.entity';
import { withFilterIconMeta } from 'src/filter/filter-icon.util';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Filter)
    private readonly filterRepo: Repository<Filter>,

    private firebaseService: FirebaseService, // 👈 add this
  ) {}

  private normalizeFilterPreferenceIds(preferences: unknown): number[] {
    if (!Array.isArray(preferences)) return [];

    const ids = preferences
      .map((preference) => Number(preference))
      .filter((preference) => Number.isInteger(preference) && preference > 0);

    return Array.from(new Set(ids));
  }

  private hasInvalidFilterPreferenceIds(preferences: unknown[]): boolean {
    return preferences.some((preference) => {
      const id = Number(preference);
      return !Number.isInteger(id) || id <= 0;
    });
  }

  private async findFiltersInPreferenceOrder(preferenceIds: number[]) {
    if (!preferenceIds.length) return [];

    const filters = await this.filterRepo.find({
      where: { id: In(preferenceIds) },
    });
    const filtersById = new Map(filters.map((filter) => [filter.id, filter]));

    return preferenceIds
      .map((id) => filtersById.get(id))
      .filter((filter): filter is Filter => Boolean(filter))
      .map((filter) => withFilterIconMeta(filter));
  }

  async getUserById(id: number) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['country', 'language'],
    });

    if (!user) throw new NotFoundException('User not found');

    return user;
  }

  async updateUser(id: number, data: any) {
    const user = await this.userRepo.findOne({ where: { id } });
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
      select: ['id', 'filter_preferences'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid user session');
    }

    const preferenceIds = this.normalizeFilterPreferenceIds(
      user.filter_preferences,
    );
    const filters = await this.findFiltersInPreferenceOrder(preferenceIds);

    return { data: preferenceIds, filters };
  }

  async updateUserFilterPreferences(userId: number, newFilters: number[]) {
    if (this.hasInvalidFilterPreferenceIds(newFilters)) {
      throw new BadRequestException('Filter preferences must be valid IDs');
    }

    const newFilterIds = this.normalizeFilterPreferenceIds(newFilters);
    const existingFilters = newFilterIds.length
      ? await this.filterRepo.find({
          where: { id: In(newFilterIds) },
          select: ['id'],
        })
      : [];

    if (existingFilters.length !== newFilterIds.length) {
      throw new BadRequestException('One or more filter preferences are invalid');
    }

    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'filter_preferences', 'fcmTokens'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid user session');
    }

    const oldFilters = this.normalizeFilterPreferenceIds(
      user.filter_preferences,
    );

    // update in DB
    user.filter_preferences = newFilterIds;
    await this.userRepo.save(user);

    // sync Firebase topics for all user's tokens
    for (const token of user.fcmTokens || []) {
      await this.firebaseService.updateFilterSubscriptions(
        token,
        oldFilters,
        newFilterIds,
      );
    }

    return newFilterIds;
  }
}
