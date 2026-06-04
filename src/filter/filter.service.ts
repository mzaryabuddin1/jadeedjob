import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Filter } from './entities/filter.entity';
import { User } from 'src/users/entities/user.entity';
import { toSentenceCase } from 'src/common/utils/utils.util';
import { SEED_FILTERS } from './seed-filters.data';

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

  async getFilters(
    query: any,
    options?: { approvedOnly?: boolean; userId?: number },
  ) {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      createdBy,
      preference = true,
    } = query;

    const where: any = {};

    if (options?.approvedOnly) {
      where.approvalStatus = 'approved';
      where.status = 'active';
    }

    if (search) {
      where.name = Like(`%${search}%`);
    }

    if (createdBy && !options?.approvedOnly) {
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
    const userId = options?.userId;
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


  async filterById(id: number, options?: { approvedOnly?: boolean }) {
    const where: Record<string, unknown> = { id };

    if (options?.approvedOnly) {
      where.approvalStatus = 'approved';
      where.status = 'active';
    }

    const filter = await this.filterRepo.findOne({ where: where as any });

    if (!filter) {
      throw new NotFoundException('Filter not found');
    }

    return filter;
  }

  async getTopFiltersByJobs(limit = 9): Promise<number[]> {
    const result = await this.filterRepo
      .createQueryBuilder('filter')
      .leftJoin('filter.jobs', 'job')
      .select('filter.id', 'filterId')
      .addSelect('COUNT(job.id)', 'jobCount')
      .where('filter.status = :status', { status: 'active' })
      .groupBy('filter.id')
      .orderBy('jobCount', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map(r => Number(r.filterId));
  }

  /**
   * Populate fake filters for testing (CLI: npm run seed:filters).
   */
  async seedFakeFilters(options?: {
    createdBy?: number;
    approve?: boolean;
  }): Promise<{ created: Filter[]; skipped: string[] }> {
    const approve = options?.approve !== false;

    let createdBy = options?.createdBy;
    if (!createdBy) {
      const firstUser = await this.userRepo.findOne({
        where: {},
        order: { id: 'ASC' },
        select: ['id'],
      });
      if (!firstUser) {
        throw new BadRequestException(
          'No users in database. Register a user first, or pass createdBy.',
        );
      }
      createdBy = firstUser.id;
    }

    const created: Filter[] = [];
    const skipped: string[] = [];

    for (const item of SEED_FILTERS) {
      const name = toSentenceCase(item.name);
      const icon = `{icon: '${item.icon}'}`;

      const existing = await this.filterRepo.findOne({ where: { name } });
      if (existing) {
        skipped.push(name);
        continue;
      }

      const filter = await this.filterRepo.save(
        this.filterRepo.create({
          name,
          icon,
          status: 'active',
          approvalStatus: approve ? 'approved' : 'pending',
          createdBy,
        }),
      );

      created.push(filter);
    }

    return { created, skipped };
  }
}
