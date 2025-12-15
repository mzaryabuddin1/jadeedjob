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

  async getFilters(query: any) {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      approvalStatus,
      createdBy,
      preference_ids = [],
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

    const [filters, total] = await this.filterRepo.findAndCount({
      where,
      take: limit,
      skip: (page - 1) * limit,
      order: {
        [sortBy]: sortOrder.toUpperCase(),
      },
      relations: ['jobs'],
    });

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
    const filter = await this.filterRepo.findOne({
      where: { id },
    });

    if (!filter) {
      throw new NotFoundException('Filter not found');
    }

    return filter;
  }
}
