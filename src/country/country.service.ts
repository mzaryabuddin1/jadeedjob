import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Country } from './country.schema';
import { Model, SortOrder } from 'mongoose';

@Injectable()
export class CountryService {
  constructor(
    @InjectModel(Country.name) private readonly countryModel: Model<Country>,
  ) {}

  async getAllCountries(options: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: 'name' | 'dialCode' | 'alpha2' | 'region';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    data: Country[];
    total: number;
    totalPages: number;
    currentPage: number;
  }> {
    const {
      limit = 20,
      page = 1,
      search = '',
      sortBy = 'name',
      sortOrder = 'asc',
    } = options;

    const skip = (page - 1) * limit;

    // Build query
    const query: Record<string, any> = { isActive: true };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // Build sort
    const sort: Record<string, SortOrder> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    // Execute query and count in parallel
    const [data, total] = await Promise.all([
      this.countryModel.find(query).sort(sort).skip(skip).limit(limit).exec(),
      this.countryModel.countDocuments(query).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      totalPages,
      currentPage: page,
    };
  }

  async getCountryById(id: string): Promise<Country> {
    const country = await this.countryModel.findById(id).exec();
    if (!country) {
      throw new NotFoundException('Country not found');
    }
    return country;
  }
}
