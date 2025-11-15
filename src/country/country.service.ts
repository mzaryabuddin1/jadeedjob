import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CountryService {
  constructor(private prisma: PrismaService) {}

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
      isActive: true,
      ...(search
        ? { name: { contains: search, mode: 'insensitive' } }
        : {}),
    };

    const orderBy = {
      [sortBy]: sortOrder,
    };

    const [data, total] = await Promise.all([
      this.prisma.country.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.country.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      totalPages,
      currentPage: page,
    };
  }

  async getCountryById(id: string) {
    const country = await this.prisma.country.findUnique({
      where: { id: Number(id) },
    });

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    return country;
  }
}
