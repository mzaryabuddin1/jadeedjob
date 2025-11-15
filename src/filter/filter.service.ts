import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FilterService {
  constructor(private prisma: PrismaService) {}

  async createFilter(data: any) {
    return this.prisma.filter.create({
      data: {
        name: data.name,
        icon: data.icon ?? 'fas fa-user-tie',
        status: data.status ?? 'active',
        approvalStatus: 'pending',
        rejectionReason: null,
        createdBy: data.createdBy,
      },
    });
  }

  async getFilters(query: any) {
    const {
      page = 1,
      limit = 20,
      search,
      preference_ids = [],
      sortBy = 'createdAt',
      sortOrder = 'desc',
      approvalStatus,
      createdBy,
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (approvalStatus) {
      where.approvalStatus = approvalStatus;
    }

    if (createdBy) {
      where.createdBy = Number(createdBy);
    }

    // --- FETCH FILTERS ---
    const [filters, total] = await Promise.all([
      this.prisma.filter.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          jobs: {
            where: { isActive: true },
            select: { id: true },
          },
        },
      }),
      this.prisma.filter.count({ where }),
    ]);

    // --- TRANSFORM RESULTS ---
    const data = filters.map((f) => ({
      ...f,
      jobCount: f.jobs.length,
      isPreferred: preference_ids.includes(f.id),
      jobs: undefined,
    }));

    return {
      data,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
    };
  }

  async filterById(id: number) {
    const filter = await this.prisma.filter.findUnique({
      where: { id },
    });

    if (!filter) {
      throw new NotFoundException('Filter not found');
    }

    return filter;
  }
}
