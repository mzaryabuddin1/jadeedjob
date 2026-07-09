import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import {
  Filter,
  FilterIconLibrary,
  FilterIconSource,
} from './entities/filter.entity';
import { User } from 'src/users/entities/user.entity';

const DEFAULT_ICON_COLOR = '#2563EB';
const FALLBACK_ICON_COLOR = '#6B7280';
const FALLBACK_ICON_LIBRARY = 'Feather';
const FALLBACK_ICON_NAME = 'briefcase';
const ICON_LIBRARIES = ['Feather', 'FontAwesome', 'FontAwesome5'] as const;
const ICON_SOURCES = ['library', 'svg'] as const;
const SAFE_SVG_TAGS = [
  'svg',
  'g',
  'path',
  'circle',
  'rect',
  'line',
  'polyline',
  'polygon',
  'ellipse',
  'defs',
  'clipPath',
  'title',
  'desc',
];

type NormalizedFilterIconData = {
  icon: string;
  iconSource: FilterIconSource;
  iconLibrary: FilterIconLibrary | null;
  iconName: string | null;
  iconColor: string;
  iconSvg: string | null;
};

@Injectable()
export class FilterService {
  constructor(
    @InjectRepository(Filter)
    private filterRepo: Repository<Filter>,

    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  private sanitizeInlineSvg(svg: string): string {
    if (!svg || svg.length > 8000) {
      throw new BadRequestException('Invalid SVG icon');
    }

    const blockedPattern =
      /<\s*(script|foreignObject|iframe|object|embed|image|use|style|link|meta|base)\b|on[a-z]+\s*=|javascript:|data:|href\s*=|xlink:href\s*=/i;

    if (blockedPattern.test(svg)) {
      throw new BadRequestException('Unsafe SVG icon');
    }

    const tagPattern = /<\/?\s*([a-zA-Z][\w:-]*)\b/g;
    let match: RegExpExecArray | null;

    while ((match = tagPattern.exec(svg)) !== null) {
      if (!(SAFE_SVG_TAGS as readonly string[]).includes(match[1])) {
        throw new BadRequestException('Unsupported SVG icon tag');
      }
    }

    return svg.trim();
  }

  private normalizeIconData(data: any): NormalizedFilterIconData {
    const requestedIconSource = data.iconSource as FilterIconSource;
    const iconSource: FilterIconSource = ICON_SOURCES.includes(
      requestedIconSource,
    )
      ? requestedIconSource
      : 'library';
    const iconColor = data.iconColor || DEFAULT_ICON_COLOR;

    if (iconSource === 'svg') {
      return {
        icon: data.icon || data.iconName || 'custom-svg',
        iconSource,
        iconLibrary: null,
        iconName: null,
        iconColor,
        iconSvg: this.sanitizeInlineSvg(data.iconSvg),
      };
    }

    const requestedIconLibrary = data.iconLibrary as FilterIconLibrary;
    const iconLibrary: FilterIconLibrary = ICON_LIBRARIES.includes(
      requestedIconLibrary,
    )
      ? requestedIconLibrary
      : FALLBACK_ICON_LIBRARY;
    const iconName = data.iconName || data.icon || FALLBACK_ICON_NAME;

    return {
      icon: data.icon || iconName,
      iconSource: 'library',
      iconLibrary,
      iconName,
      iconColor,
      iconSvg: null,
    };
  }

  private buildIconMeta(filter: Filter) {
    if (filter.iconSource === 'svg' && filter.iconSvg) {
      return {
        source: 'svg',
        svg: filter.iconSvg,
        color: filter.iconColor || DEFAULT_ICON_COLOR,
      };
    }

    return {
      source: 'library',
      library: ICON_LIBRARIES.includes(filter.iconLibrary as any)
        ? filter.iconLibrary
        : FALLBACK_ICON_LIBRARY,
      name: filter.iconName || filter.icon || FALLBACK_ICON_NAME,
      color: filter.iconColor || FALLBACK_ICON_COLOR,
    };
  }

  private withIconMeta(filter: Filter) {
    return {
      ...filter,
      iconMeta: this.buildIconMeta(filter),
    };
  }

  async createFilter(data: any) {
    const exists = await this.filterRepo.findOne({
      where: { name: data.name },
    });

    if (exists) {
      throw new BadRequestException('Filter already exists');
    }

    const filter = this.filterRepo.create({
      name: data.name,
      ...this.normalizeIconData(data),
      status: data.status ?? 'active',
      approvalStatus: 'pending',
      createdBy: data.createdBy,
    });

    return this.withIconMeta(await this.filterRepo.save(filter));
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
      data: paginatedData.map((filter) => this.withIconMeta(filter)),
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

    return this.withIconMeta(filter);
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

}
