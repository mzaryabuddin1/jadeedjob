import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Job } from './entities/job.entity';
import { User } from '../users/entities/user.entity';
import { FirebaseService } from '../firebase/firebase.service';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { Filter } from 'src/filter/entities/filter.entity';

@Injectable()
export class JobService {
  constructor(
    @InjectRepository(Job)
    private jobRepo: Repository<Job>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(CompanyPage)
    private pageRepo: Repository<CompanyPage>,

    @InjectRepository(Filter)
    private filterRepo: Repository<Filter>,

    private firebaseService: FirebaseService,
  ) {}

  /** Resolve filterIds / legacy filterId → approved Filter entities (1–10) */
  private async resolveJobFilters(data: {
    filterIds?: number[];
    filterId?: number;
  }): Promise<Filter[]> {
    let ids: number[] = [];

    if (Array.isArray(data.filterIds) && data.filterIds.length) {
      ids = [...new Set(data.filterIds.map(Number))].filter(
        (n) => !Number.isNaN(n) && n > 0,
      );
    } else if (data.filterId != null) {
      ids = [Number(data.filterId)];
    }

    if (!ids.length) {
      throw new BadRequestException(
        'Provide filterIds (array) or filterId — at least 1 category required',
      );
    }
    if (ids.length > 10) {
      throw new BadRequestException('A job can have at most 10 filter categories');
    }

    const filters = await this.filterRepo.find({
      where: {
        id: In(ids),
        status: 'active',
        approvalStatus: 'approved',
      },
    });

    if (filters.length !== ids.length) {
      throw new BadRequestException(
        'One or more filterIds are invalid or not approved',
      );
    }

    // Preserve caller order
    const byId = new Map(filters.map((f) => [f.id, f]));
    return ids.map((id) => byId.get(id)!);
  }

  // ────────────────────────────────────────────────
  // CREATE JOB + SEND NOTIFICATION
  // ────────────────────────────────────────────────
  async createJob(data: any, userId: number) {
    // App may send companyId instead of pageId
    const requestedPageId =
      data.pageId != null ? Number(data.pageId) : data.companyId != null
        ? Number(data.companyId)
        : null;

    let pageId: number | null = null;

    if (requestedPageId) {
      const page = await this.pageRepo.findOne({
        where: { id: requestedPageId },
        relations: ['members'],
      });

      if (!page) {
        throw new BadRequestException('Page not found');
      }

      const member =
        page.ownerId === userId
          ? { role: 'owner' }
          : page.members.find((m) => m.userId === userId);

      if (!member || !['owner', 'admin', 'editor'].includes(member.role)) {
        throw new BadRequestException(
          'You are not allowed to create jobs for this page',
        );
      }

      pageId = page.id;
    }

    const isRemote = data.isRemote === true;

    if (!isRemote) {
      if (
        typeof data.location?.lat !== 'number' ||
        typeof data.location?.lng !== 'number'
      ) {
        throw new BadRequestException(
          'Location (lat/lng) is required for on-site jobs',
        );
      }
    }

    const hasLocation =
      typeof data.location?.lat === 'number' &&
      typeof data.location?.lng === 'number';

    const filters = await this.resolveJobFilters(data);
    const primaryFilterId = filters[0].id;

    const pictures =
      Array.isArray(data.pictures) && data.pictures.length
        ? data.pictures.slice(0, 4)
        : null;

    // Whitelist columns only — never spread raw body (postingMode/status/etc.)
    const values: Record<string, any> = {
      title: data.title,
      description: data.description ?? null,
      filterId: primaryFilterId,
      createdBy: userId,
      pageId: pageId ?? null,
      isRemote,
      pictures,
      salaryType: data.salaryType,
      salaryAmount: data.salaryAmount,
      currency: data.currency ?? null,
      requirements: data.requirements ?? null,
      benefits: data.benefits ?? null,
      shifts: data.shifts ?? null,
      jobTypes: data.jobTypes ?? null,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      industry: data.industry ?? null,
      educationLevel: data.educationLevel ?? null,
      experienceRequired: data.experienceRequired ?? null,
      languageRequirements: data.languageRequirements ?? null,
      isActive: true,
      location: hasLocation
        ? () =>
            `ST_GeomFromText('POINT(${data.location.lng} ${data.location.lat})', 4326)`
        : null,
    };

    let insertedId: number;
    try {
      const insertResult = await this.jobRepo
        .createQueryBuilder()
        .insert()
        .into(Job)
        .values(values)
        .execute();

      insertedId = insertResult.identifiers?.[0]?.id;
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (
        /Unknown column|ER_BAD_FIELD_ERROR|doesn't exist/i.test(msg)
      ) {
        throw new BadRequestException(
          `Database schema missing columns (isRemote/pictures?). Restart app with synchronize or run ALTER. Detail: ${msg}`,
        );
      }
      throw err;
    }

    if (!insertedId) {
      throw new BadRequestException('Failed to create job');
    }

    // Set M2M via relation API — avoid save() which re-writes POINT as object → MySQL 500
    await this.jobRepo
      .createQueryBuilder()
      .relation(Job, 'filters')
      .of(insertedId)
      .add(filters.map((f) => f.id));

    const withFilters = await this.jobRepo.findOne({
      where: { id: insertedId },
      relations: ['filters', 'filter', 'page'],
    });

    // Notify subscribers of every tagged category
    for (const f of filters) {
      try {
        await this.firebaseService.sendToFilterTopic(
          f.id,
          'New Job Posted',
          withFilters?.title ?? 'A new job matches your preferences!',
          {
            jobId: String(insertedId),
            filterId: String(f.id),
            filterIds: filters.map((x) => x.id).join(','),
          },
        );
      } catch {
        // FCM is best-effort
      }
    }

    return {
      ...withFilters,
      filterIds: (withFilters?.filters || []).map((f) => f.id),
    };
  }

  // ────────────────────────────────────────────────
  // GEO: FIND NEARBY JOBS
  // ────────────────────────────────────────────────
  async findNearbyJobs(query: any) {
    const {
      lat,
      lng,
      page = 1,
      limit = 10,
      radiusKm = 1,
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const currentPage = Number(page);
    const take = Number(limit);
    const offset = (currentPage - 1) * take;
    const radiusMeters = Number(radiusKm) * 1000;

    // 🔥 SRID-safe point
    const point = `ST_GeomFromText('POINT(${lng} ${lat})', 4326)`;

    // ────────────────────────────────────────────────
    // 1️⃣ DATA QUERY
    // ────────────────────────────────────────────────
    const jobs = await this.jobRepo.query(`
    SELECT
      j.*,
      ST_X(j.location) AS lng,
      ST_Y(j.location) AS lat,
      p.id AS page_id,
      p.company_name,
      p.username AS page_username,
      p.company_logo,
      ST_Distance_Sphere(
        ST_SRID(j.location, 4326),
        ${point}
      ) AS distance
    FROM jobs j
    LEFT JOIN pages p ON p.id = j.pageId
    WHERE j.isActive = 1
      AND ST_Distance_Sphere(
        ST_SRID(j.location, 4326),
        ${point}
      ) <= ${radiusMeters}
      ${search ? `AND j.description LIKE '%${search}%'` : ''}
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT ${take}
    OFFSET ${offset}
  `);

    // ────────────────────────────────────────────────
    // 2️⃣ COUNT QUERY
    // ────────────────────────────────────────────────
    const countResult = await this.jobRepo.query(`
    SELECT COUNT(*) AS total
    FROM jobs j
    WHERE j.isActive = 1
      AND ST_Distance_Sphere(
        ST_SRID(j.location, 4326),
        ${point}
      ) <= ${radiusMeters}
      ${search ? `AND j.description LIKE '%${search}%'` : ''}
  `);

    const total = Number(countResult[0]?.total || 0);

    // ────────────────────────────────────────────────
    // 3️⃣ RESPONSE NORMALIZATION
    // ────────────────────────────────────────────────
    return {
      data: jobs.map((j) => ({
        ...j,
        location: {
          lat: j.lat,
          lng: j.lng,
        },
        jobType: j.page_id ? 'page' : 'open',
        page: j.page_id
          ? {
              id: j.page_id,
              company_name: j.company_name,
              username: j.page_username,
              company_logo: j.company_logo,
            }
          : null,
      })),
      total,
      totalPages: Math.ceil(total / take),
      currentPage,
    };
  }

  // ────────────────────────────────────────────────
  // NORMAL SEARCH (NO GEO)
  // ────────────────────────────────────────────────
  async findJobs(query: any, userId?: number) {
    const {
      filter,
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      lat,
      lng,
      myjobs = false,
    } = query;

    // 🔹 GEO SEARCH (public jobs only)
    if (lat && lng && myjobs !== 'true') {
      return this.findNearbyJobs(query);
    }

    const qb = this.jobRepo
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.page', 'page')
      .leftJoinAndSelect('job.filter', 'filter')
      .leftJoinAndSelect('job.filters', 'filters');

    if (myjobs === 'true') {
      if (!userId) {
        throw new BadRequestException('User not authenticated');
      }
      qb.andWhere('job.createdBy = :userId', { userId });
    } else {
      qb.andWhere('job.isActive = true');
    }

    if (filter) {
      const filterId = Number(filter);
      qb.andWhere(
        '(job.filterId = :filterId OR filters.id = :filterId)',
        { filterId },
      );
    }

    if (search) {
      qb.andWhere('job.description LIKE :search', {
        search: `%${search}%`,
      });
    }

    qb.orderBy(`job.${sortBy}`, String(sortOrder).toUpperCase() as 'ASC' | 'DESC')
      .take(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const [jobs, total] = await qb.getManyAndCount();

    return {
      data: jobs.map((job) => ({
        ...job,
        filterIds: (job.filters || []).map((f) => f.id),
        pageTaggedJob: job.pageId ? true : false,
        page: job.pageId
          ? {
              id: job.page.id,
              company_name: job.page.company_name,
              username: job.page.username,
              company_logo: job.page.company_logo,
            }
          : null,
      })),
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
    };
  }

  async findJobById(id: number) {
    const job = await this.jobRepo.findOne({
      where: {
        id,
        isActive: true,
      },
      relations: ['filters', 'filter', 'page'],
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    return {
      ...job,
      filterIds: (job.filters || []).map((f) => f.id),
    };
  }

  async updateJob(id: number, data: any, userId: number) {
    const job = await this.jobRepo.findOne({ where: { id } });

    if (!job) throw new NotFoundException(`Job with ID ${id} not found`);

    const effectivePageId =
      data.pageId !== undefined ? data.pageId : (job.pageId ?? null);

    if (effectivePageId) {
      const page = await this.pageRepo.findOne({
        where: { id: effectivePageId },
        relations: ['members'],
      });

      if (!page) throw new BadRequestException('Page not found');

      const member =
        page.ownerId === userId
          ? { role: 'owner' }
          : page.members.find((m) => m.userId === userId);

      if (!member || !['owner', 'admin', 'editor'].includes(member.role)) {
        throw new BadRequestException(
          'You are not allowed to update jobs for this page',
        );
      }
    } else {
      if (job.createdBy !== userId) {
        throw new BadRequestException('You are not allowed to update this job');
      }
    }

    // Location / remote:
    // - isRemote true → location optional (omit or clear if not provided)
    // - isRemote false (or becoming on-site) → location required when provided/needed
    let locationUpdate: any = undefined;
    const becomingRemote = data.isRemote === true;
    const becomingOnSite = data.isRemote === false;

    if (becomingRemote && data.location == null) {
      locationUpdate = null;
    } else if (data.location) {
      if (
        typeof data.location?.lat !== 'number' ||
        typeof data.location?.lng !== 'number'
      ) {
        throw new BadRequestException('Valid location (lat/lng) is required');
      }
      locationUpdate = () =>
        `ST_GeomFromText('POINT(${data.location.lng} ${data.location.lat})', 4326)`;
    } else if (becomingOnSite && !job.location) {
      throw new BadRequestException(
        'Location (lat/lng) is required for on-site jobs',
      );
    }

    const {
      createdBy,
      location,
      filterIds,
      filterId,
      filters: _filters,
      pictures,
      ...patch
    } = data;

    const updatePayload: any = {
      ...patch,
    };

    if (data.pageId !== undefined) {
      updatePayload.pageId = data.pageId ?? null;
    }

    if (locationUpdate !== undefined) {
      updatePayload.location = locationUpdate;
    }

    if (pictures !== undefined) {
      updatePayload.pictures =
        Array.isArray(pictures) && pictures.length
          ? pictures.slice(0, 4)
          : null;
    }

    if (data.description !== undefined) {
      updatePayload.description = data.description || null;
    }

    // Update categories if provided
    let nextFilters: Filter[] | undefined;
    if (filterIds !== undefined || filterId !== undefined) {
      nextFilters = await this.resolveJobFilters({ filterIds, filterId });
      updatePayload.filterId = nextFilters[0].id;
    }

    // Never pass location object through .update() — use QueryBuilder raw SQL
    const { location: locRaw, ...scalarPatch } = updatePayload;
    if (Object.keys(scalarPatch).length) {
      await this.jobRepo.update({ id }, scalarPatch);
    }
    if (locRaw !== undefined) {
      await this.jobRepo
        .createQueryBuilder()
        .update(Job)
        .set({ location: locRaw })
        .where('id = :id', { id })
        .execute();
    }

    if (nextFilters) {
      const current = await this.jobRepo.findOne({
        where: { id },
        relations: ['filters'],
      });
      const oldIds = (current?.filters || []).map((f) => f.id);
      const newIds = nextFilters.map((f) => f.id);
      await this.jobRepo
        .createQueryBuilder()
        .relation(Job, 'filters')
        .of(id)
        .addAndRemove(newIds, oldIds);
    }

    const updated = await this.jobRepo.findOne({
      where: { id },
      relations: ['filters', 'filter', 'page'],
    });
    if (!updated) throw new BadRequestException('Failed to load updated job');

    return {
      ...updated,
      filterIds: (updated.filters || []).map((f) => f.id),
    };
  }
}
