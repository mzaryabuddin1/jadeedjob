import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { WorkExperience } from './entities/work-experience.entity';
import { Education } from './entities/education.entity';
import { Certification } from './entities/certification.entity';
import { FirebaseService } from 'src/firebase/firebase.service';
import { Filter } from 'src/filter/entities/filter.entity';
import { withFilterIconMeta } from 'src/filter/filter-icon.util';
import { Country } from 'src/country/entities/country.entity';
import { Language } from 'src/language/entities/language.entity';

type ProfileUpdateData = Record<string, any>;

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

  private toPublicUser(user: User) {
    const {
      passwordHash,
      passwordSalt,
      fcmTokens,
      password,
      ...publicUser
    } = user as any;

    return publicUser;
  }

  private normalizeNullableDates(data: ProfileUpdateData, fields: string[]) {
    for (const field of fields) {
      if (data[field] === '') {
        data[field] = null;
      }
    }
  }

  private relationIdFromValue(field: string, value: unknown) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException(`${field} must be a valid ID`);
    }

    return id;
  }

  async getUserById(id: number) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['country', 'language'],
    });

    if (!user) throw new NotFoundException('User not found');

    return user;
  }

  async getPublicUserById(id: number) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['country', 'language'],
    });

    if (!user) throw new NotFoundException('User not found');

    return this.toPublicUser(user);
  }

  async updateUser(id: number, data: any) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    Object.assign(user, data);

    return this.userRepo.save(user);
  }

  async updateMyProfile(id: number, data: ProfileUpdateData) {
    const updatedUser = await this.userRepo.manager.transaction(
      async (manager) => {
        const userRepo = manager.getRepository(User);
        const countryRepo = manager.getRepository(Country);
        const languageRepo = manager.getRepository(Language);
        const workExperienceRepo = manager.getRepository(WorkExperience);
        const educationRepo = manager.getRepository(Education);
        const certificationRepo = manager.getRepository(Certification);

        const user = await userRepo.findOne({
          where: { id },
          relations: ['country', 'language'],
        });

        if (!user) throw new NotFoundException('User not found');

        const updateData = { ...data };
        const workExperience = updateData.work_experience;
        const education = updateData.education;
        const certifications = updateData.certifications;

        delete updateData.work_experience;
        delete updateData.education;
        delete updateData.certifications;

        const countryId = this.relationIdFromValue(
          'country',
          updateData.country,
        );
        if (countryId !== undefined) {
          const country = await countryRepo.findOne({
            where: { id: countryId },
          });
          if (!country) throw new BadRequestException('Country not found');
          user.country = country;
        }
        delete updateData.country;

        const languageId = this.relationIdFromValue(
          'language',
          updateData.language,
        );
        if (languageId !== undefined) {
          const language = await languageRepo.findOne({
            where: { id: languageId },
          });
          if (!language) throw new BadRequestException('Language not found');
          user.language = language;
        }
        delete updateData.language;

        this.normalizeNullableDates(updateData, [
          'date_of_birth',
          'id_expiry_date',
          'verification_date',
        ]);

        Object.assign(user, updateData);
        const savedUser = await userRepo.save(user);

        if (Array.isArray(workExperience)) {
          await workExperienceRepo
            .createQueryBuilder()
            .delete()
            .from(WorkExperience)
            .where('userId = :userId', { userId: id })
            .execute();

          const workExperienceRows = workExperience.map((item) => {
            const row = { ...item };
            delete row.id;
            this.normalizeNullableDates(row, ['from_date', 'to_date']);
            return {
              ...row,
              user: savedUser,
            };
          }) as any[];

          if (workExperienceRows.length) {
            await workExperienceRepo.save(workExperienceRows);
          }
        }

        if (Array.isArray(education)) {
          await educationRepo
            .createQueryBuilder()
            .delete()
            .from(Education)
            .where('userId = :userId', { userId: id })
            .execute();

          const educationRows = education.map((item) => {
            const row = { ...item };
            delete row.id;
            return {
              ...row,
              user: savedUser,
            };
          }) as any[];

          if (educationRows.length) {
            await educationRepo.save(educationRows);
          }
        }

        if (Array.isArray(certifications)) {
          await certificationRepo
            .createQueryBuilder()
            .delete()
            .from(Certification)
            .where('userId = :userId', { userId: id })
            .execute();

          const certificationRows = certifications.map((item) => {
            const row = { ...item };
            delete row.id;
            this.normalizeNullableDates(row, ['certification_date']);
            return {
              ...row,
              user: savedUser,
            };
          }) as any[];

          if (certificationRows.length) {
            await certificationRepo.save(certificationRows);
          }
        }

        return userRepo.findOne({
          where: { id },
          relations: ['country', 'language'],
        });
      },
    );

    if (!updatedUser) throw new NotFoundException('User not found');

    return this.toPublicUser(updatedUser);
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
