import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Raw, Not, IsNull } from 'typeorm';
import { Job } from './entities/job.entity';
import { User } from '../users/entities/user.entity';
import { FirebaseService } from '../firebase/firebase.service';
import { CompanyPage } from 'src/pages/entities/company-page.entity';

@Injectable()
export class JobService {
  constructor(
    @InjectRepository(Job)
    private jobRepo: Repository<Job>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(CompanyPage)
    private pageRepo: Repository<CompanyPage>,

    private firebaseService: FirebaseService,
  ) {}

  // ────────────────────────────────────────────────
  // CREATE JOB + SEND NOTIFICATION
  // ────────────────────────────────────────────────
  async createJob(data: any, userId: number) {
    let pageId: number | null = null;

    // ────────────────────────────────────────────────
    // 1️⃣ PAGE PERMISSION CHECK (optional)
    // ────────────────────────────────────────────────
    if (data.pageId) {
      const page = await this.pageRepo.findOne({
        where: { id: data.pageId },
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

    // ────────────────────────────────────────────────
    // 2️⃣ LOCATION (lat/lng → MySQL POINT with SRID 4326)
    // ────────────────────────────────────────────────
    if (!data.location || data.isRemote === false) {
      if (
        typeof data.location?.lat !== 'number' ||
        typeof data.location?.lng !== 'number'
      ) {
        throw new BadRequestException('Valid location is required');
      }
    }

    const location =
      data.isRemote === true
        ? null
        : () =>
            `ST_GeomFromText('POINT(${data.location.lng} ${data.location.lat})', 4326)`;

    // ────────────────────────────────────────────────
    // 3️⃣ REMOVE RAW LOCATION OBJECT (VERY IMPORTANT)
    // ────────────────────────────────────────────────
    const { location: _location, pageId: _pageId, ...jobData } = data;

    // ────────────────────────────────────────────────
    // 4️⃣ CREATE JOB
    // ────────────────────────────────────────────────
    const job = this.jobRepo.create({
      ...jobData,
      createdBy: userId,
      pageId,
      location,
      isActive: true,
    });

    return this.jobRepo.save(job);
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
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      radiusKm = 1,
    } = query;

    const offset = (page - 1) * limit;
    const radiusMeters = radiusKm * 1000;

    const point = `ST_GeomFromText('POINT(${lng} ${lat})', 4326)`;

const jobs = await this.jobRepo.query(`
  SELECT 
    j.*,
    p.id AS page_id,
    p.company_name,
    p.username AS page_username,
    p.company_logo,
    ST_Distance_Sphere(
      ST_SRID(j.location, 4326),
      ST_GeomFromText('POINT(${lng} ${lat})', 4326)
    ) AS distance
  FROM jobs j
  LEFT JOIN pages p ON p.id = j.pageId
  WHERE j.isActive = 1
    AND ST_Distance_Sphere(
      ST_SRID(j.location, 4326),
      ST_GeomFromText('POINT(${lng} ${lat})', 4326)
    ) <= ${radiusMeters}
  ${search ? `AND j.description LIKE '%${search}%'` : ''}
  ORDER BY ${sortBy} ${sortOrder}
  LIMIT ${limit}
  OFFSET ${offset}
`);

    const countResult = await this.jobRepo.query(`
    SELECT COUNT(*) AS count
    FROM jobs j
    WHERE j.isActive = 1
    AND ST_Distance_Sphere(j.location, ${point}) <= ${radiusMeters}
    ${search ? `AND j.description LIKE '%${search}%'` : ''}
  `);

    const total = Number(countResult[0].count);

return {
  data: jobs.map((j) => ({
    ...j,
    pageTaggedJob: j.page_id ? true : false,
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
  totalPages: Math.ceil(total / limit),
  currentPage: page,
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

    const where: any = {};

    // 🔥 MY JOBS MODE
    if (myjobs === 'true') {
      if (!userId) {
        throw new BadRequestException('User not authenticated');
      }

      where.createdBy = userId; // 👈 ONLY MY JOBS
      // ❗ no isActive filter (active + inactive)
    } else {
      where.isActive = true; // 👈 public jobs only
    }

    if (filter) where.filterId = Number(filter);

    if (search) {
      where.description = Raw((alias) => `${alias} LIKE '%${search}%'`);
    }

    const [jobs, total] = await this.jobRepo.findAndCount({
      where,
      relations: ['page'], // 👈 IMPORTANT
      order: { [sortBy]: sortOrder.toUpperCase() },
      take: limit,
      skip: (page - 1) * limit,
    });


    return {
      data: jobs.map((job) => ({
        ...job,
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
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
    };
  }

  async findJobById(id: number) {
    const job = await this.jobRepo.findOne({
      where: {
        id,
        isActive: true,
      },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    return job;
  }
}
