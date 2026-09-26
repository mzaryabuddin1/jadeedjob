import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { City } from './entities/city.entity';
import { Country } from 'src/country/entities/country.entity';
import { SEED_PAKISTAN_CITIES } from './seed-cities.data';

@Injectable()
export class CityService {
  constructor(
    @InjectRepository(City)
    private cityRepo: Repository<City>,
    @InjectRepository(Country)
    private countryRepo: Repository<Country>,
  ) {}

  async getCities(options: {
    countryId?: number;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const { countryId, page = 1, limit = 50, search = '' } = options;
    const where: any = {};

    if (countryId) where.countryId = Number(countryId);
    if (search) where.name = Like(`%${search}%`);

    const [data, total] = await this.cityRepo.findAndCount({
      where,
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  }

  async getCityById(id: number) {
    const city = await this.cityRepo.findOne({ where: { id } });
    if (!city) throw new NotFoundException('City not found');
    return city;
  }

  /**
   * Seed cities for Pakistan (CLI: npm run seed:cities).
   */
  async seedPakistanCities(): Promise<{
    created: City[];
    skipped: string[];
    countryId: number;
  }> {
    let country = await this.countryRepo.findOne({
      where: { code: 'PK' },
    });

    if (!country) {
      country = await this.countryRepo.findOne({
        where: { name: 'Pakistan' },
      });
    }

    if (!country) {
      throw new NotFoundException(
        'Pakistan country not found. Run npm run seed:countries first.',
      );
    }

    const created: City[] = [];
    const skipped: string[] = [];

    for (const name of SEED_PAKISTAN_CITIES) {
      const existing = await this.cityRepo.findOne({
        where: { name, countryId: country.id },
      });

      if (existing) {
        skipped.push(name);
        continue;
      }

      const city = await this.cityRepo.save(
        this.cityRepo.create({
          name,
          countryId: country.id,
          country,
        }),
      );
      created.push(city);
    }

    return { created, skipped, countryId: country.id };
  }
}
