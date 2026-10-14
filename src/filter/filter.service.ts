import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Filter, FilterIcon } from './entities/filter.entity';
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

  /** Max updatedAt across filters — use for client cache invalidation */
  async getLastUpdateTime(
    options?: { approvedOnly?: boolean },
  ): Promise<string | null> {
    const qb = this.filterRepo
      .createQueryBuilder('filter')
      .select('MAX(filter.updatedAt)', 'lastUpdate');

    if (options?.approvedOnly) {
      qb.where('filter.approvalStatus = :approval', {
        approval: 'approved',
      }).andWhere('filter.status = :status', { status: 'active' });
    }

    const raw = await qb.getRawOne<{ lastUpdate: Date | string | null }>();
    if (!raw?.lastUpdate) return null;
    return new Date(raw.lastUpdate).toISOString();
  }

  toPublicFilter(filter: Filter) {
    return {
      id: filter.id,
      name: filter.name,
      icon: this.normalizeIcon(filter.icon),
      status: filter.status,
      approvalStatus: filter.approvalStatus,
      createdAt: filter.createdAt,
      updatedAt: filter.updatedAt,
    };
  }

  /** Normalize legacy string icons → tabler object */
  normalizeIcon(icon: FilterIcon | string | null | undefined): FilterIcon {
    if (!icon) {
      return { type: 'tabler', name: 'briefcase' };
    }
    if (typeof icon === 'string') {
      // Legacy: "{ icon: 'hammer' }" or "hammer" or "fas fa-..."
      const match = icon.match(/icon:\s*'([^']+)'/);
      const name = match?.[1] || icon.replace(/^fas\s+fa-/, '').trim() || 'briefcase';
      return { type: 'tabler', name };
    }
    if (icon.type === 'tabler' && icon.name) {
      return { type: 'tabler', name: String(icon.name).trim() };
    }
    if (icon.type === 'custom' && icon.svg) {
      return { type: 'custom', svg: String(icon.svg) };
    }
    return { type: 'tabler', name: 'briefcase' };
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

    const usePreference =
      preference === true ||
      preference === 'true' ||
      preference === 1 ||
      preference === '1';

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

    const filters = await this.filterRepo.find({
      where,
      order: {
        [sortBy]: sortOrder.toUpperCase(),
      },
    });

    let orderedFilters = filters;

    const userId = options?.userId;
    if (usePreference && userId) {
      try {
        // QueryBuilder avoids TypeORM MySQL bug:
        // "Unknown column distinctAlias.User_id" with partial findOne select
        const row = await this.userRepo
          .createQueryBuilder('u')
          .select(['u.id', 'u.filter_preferences'])
          .where('u.id = :userId', { userId })
          .getOne();

        const preferences = Array.isArray(row?.filter_preferences)
          ? row.filter_preferences.map(Number).filter((n) => !Number.isNaN(n))
          : [];

        if (preferences.length) {
          const byId = new Map(filters.map((f) => [f.id, f]));
          const preferred = [];
          const preferredIds = new Set<number>();

          for (const id of preferences) {
            const f = byId.get(Number(id));
            if (f) {
              preferred.push(f);
              preferredIds.add(f.id);
            }
          }

          const others = filters.filter((f) => !preferredIds.has(f.id));
          orderedFilters = [...preferred, ...others];
        }
      } catch {
        // Preference reorder is best-effort — never fail the whole filters list
        orderedFilters = filters;
      }
    }

    const total = orderedFilters.length;
    const paginatedData = orderedFilters.slice(
      (page - 1) * limit,
      page * limit,
    );

    const last_update_time = await this.getLastUpdateTime({
      approvedOnly: options?.approvedOnly,
    });

    return {
      last_update_time,
      data: paginatedData.map((f) => this.toPublicFilter(f)),
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

    const last_update_time = await this.getLastUpdateTime({
      approvedOnly: options?.approvedOnly,
    });

    return {
      last_update_time,
      filter: this.toPublicFilter(filter),
    };
  }

  async getTopFiltersByJobs(limit = 9): Promise<number[]> {
    // Prefer many-to-many tags; fall back to primary filterId jobs
    const result = await this.filterRepo
      .createQueryBuilder('filter')
      .leftJoin('filter.taggedJobs', 'tagged')
      .leftJoin('filter.jobs', 'primaryJob')
      .select('filter.id', 'filterId')
      .addSelect(
        'COUNT(DISTINCT COALESCE(tagged.id, primaryJob.id))',
        'jobCount',
      )
      .where('filter.status = :status', { status: 'active' })
      .andWhere('filter.approvalStatus = :approval', {
        approval: 'approved',
      })
      .groupBy('filter.id')
      .orderBy('jobCount', 'DESC')
      .addOrderBy('filter.id', 'ASC')
      .limit(limit)
      .getRawMany();

    const ids = result.map((r) => Number(r.filterId)).filter(Boolean);
    if (ids.length >= limit) return ids.slice(0, limit);

    // If few/no jobs yet, still return approved filters so register defaults work
    const extras = await this.filterRepo.find({
      where: { status: 'active', approvalStatus: 'approved' },
      order: { id: 'ASC' },
      take: limit,
      select: ['id'],
    });
    const merged = [...new Set([...ids, ...extras.map((f) => f.id)])];
    return merged.slice(0, limit);
  }

  /**
   * Seed / refresh filters with Tabler icons (CLI: npm run seed:filters).
   * Creates missing names; updates icon JSON on existing rows when --update-icons.
   */
  async seedFakeFilters(options?: {
    createdBy?: number;
    approve?: boolean;
    updateIcons?: boolean;
  }): Promise<{ created: Filter[]; updated: Filter[]; skipped: string[] }> {
    const approve = options?.approve !== false;
    const updateIcons = options?.updateIcons === true;

    let createdBy: number | null = options?.createdBy ?? null;
    if (createdBy == null) {
      const firstUser = await this.userRepo.findOne({
        where: {},
        order: { id: 'ASC' },
        select: ['id'],
      });
      createdBy = firstUser?.id ?? null;
    }

    const created: Filter[] = [];
    const updated: Filter[] = [];
    const skipped: string[] = [];

    for (const item of SEED_FILTERS) {
      const name = toSentenceCase(item.name);
      const icon = item.icon as FilterIcon;

      const existing = await this.filterRepo.findOne({ where: { name } });
      if (existing) {
        if (updateIcons) {
          existing.icon = icon;
          existing.status = 'active';
          if (approve) existing.approvalStatus = 'approved';
          updated.push(await this.filterRepo.save(existing));
        } else {
          skipped.push(name);
        }
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

    return { created, updated, skipped };
  }
}
