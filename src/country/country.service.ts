import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Country } from './entities/country.entity';

@Injectable()
export class CountryService {
  constructor(
    @InjectRepository(Country)
    private countryRepo: Repository<Country>,
  ) {}

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
