import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Filter } from './entities/filter.entity';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class FilterService {
  constructor(
    @InjectRepository(Filter)
    private filterRepo: Repository<Filter>,

    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async createFilter(data: any) {
    const exists = await this.filterRepo.findOne({
      where: { name: data.name },
    });

    if (exists) {
      throw new BadRequestException('Filter already exists');
    }

    const filter = this.filterRepo.create({
      name: data.name,
      icon: data.icon ?? "{icon: 'infinity'}",
      status: data.status ?? 'active',
      approvalStatus: 'pending',
      createdBy: data.createdBy,
    });

    return this.filterRepo.save(filter);
  }

async getFilters(query: any, userId?: number) {
  const {
    page = 1,
    limit = 20,
    search,
    sortBy = 'createdAt',
    sortOrder = 'DESC',
    approvalStatus,
    createdBy,
    preference = true,
  } = query;

  const where: any = {};

  if (search) {
    where.name = Like(`%${search}%`);
  }

  if (approvalStatus) {
    where.approvalStatus = approvalStatus;
  }

  if (createdBy) {
    where.createdBy = createdBy;
  }

  // 1️⃣ Get all filters (no pagination yet)
  const filters = await this.filterRepo.find({
    where,
    order: {
      [sortBy]: sortOrder.toUpperCase(),
    },
  });

  let orderedFilters = filters;

  // 2️⃣ Reorder based on user preferences
  if (preference === true && userId) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['filter_preferences'],
    });

    const preferences = user?.filter_preferences ?? [];

    if (preferences.length) {
      const preferred = [];
      const others = [];

      for (const filter of filters) {
        if (preferences.includes(filter.id)) {
          preferred.push(filter);
        } else {
          others.push(filter);
        }
      }

      orderedFilters = [...preferred, ...others];
    }
  }

  // 3️⃣ Apply pagination AFTER reordering
  const total = orderedFilters.length;
  const paginatedData = orderedFilters.slice(
    (page - 1) * limit,
    page * limit,
  );

  return {
    data: paginatedData,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: Number(page),
  };
}


  async filterById(id: number) {
    const filter = await this.filterRepo.findOne({
      where: { id },
    });

    if (!filter) {
      throw new NotFoundException('Filter not found');
    }

    return filter;
  }
}
