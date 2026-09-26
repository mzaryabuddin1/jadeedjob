import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Country } from './entities/country.entity';
import { SEED_COUNTRIES } from './seed-countries.data';

@Injectable()
export class CountryService {
  constructor(
    @InjectRepository(Country)
    private countryRepo: Repository<Country>,
  ) {}

  /**
   * Populate countries (CLI: npm run seed:countries).
   * Skips rows that already exist by code or name.
   */
  async seedCountries(): Promise<{ created: Country[]; skipped: string[] }> {
    const created: Country[] = [];
    const skipped: string[] = [];

    for (const item of SEED_COUNTRIES) {
      const existing = await this.countryRepo.findOne({
        where: [{ code: item.code }, { name: item.name }],
      });

      if (existing) {
        skipped.push(item.name);
        continue;
      }

      const country = await this.countryRepo.save(
        this.countryRepo.create({
          name: item.name,
          code: item.code,
          dial_code: item.dial_code,
        }),
      );

      created.push(country);
    }

    return { created, skipped };
  }

  async getAllCountries(options: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: 'name' | 'dialCode' | 'alpha2' | 'region';
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      limit = 20,
      page = 1,
      search = '',
      sortBy = 'name',
      sortOrder = 'asc',
    } = options;

    const skip = (page - 1) * limit;

    const where = {
      ...(search
        ? { name: Like(`%${search}%`) }
        : {}),
    };

    const order = {
      [sortBy]: sortOrder.toUpperCase(),
    };

    const [data, total] = await this.countryRepo.findAndCount({
      where,
      order,
      skip,
      take: limit,
    });

    return {
      data,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  }

  async getCountryById(id: number) {
    const country = await this.countryRepo.findOne({
      where: { id },
    });

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    return country;
  }
}
