import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Raw } from 'typeorm';
import { Job } from './entities/job.entity';

@Injectable()
export class JobService {
  constructor(
    @InjectRepository(Job)
    private jobRepo: Repository<Job>,
  ) {}

  async createJob(data: any) {
    const { location, ...rest } = data;

    const job = this.jobRepo.create({
      ...rest,
      location: () => `POINT(${location.lng}, ${location.lat})`,
    });

    return this.jobRepo.save(job);
  }

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

    const jobs = await this.jobRepo.query(`
      SELECT 
        *, 
        ST_Distance_Sphere(location, POINT(${lng}, ${lat})) AS distance
      FROM jobs
      WHERE isActive = 1
      AND ST_Distance_Sphere(location, POINT(${lng}, ${lat})) <= ${radiusMeters}
      ${search ? `AND description LIKE '%${search}%'` : ''}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    const totalResult = await this.jobRepo.query(`
      SELECT COUNT(*) AS count
      FROM jobs
      WHERE isActive = 1
      AND ST_Distance_Sphere(location, POINT(${lng}, ${lat})) <= ${radiusMeters}
      ${search ? `AND description LIKE '%${search}%'` : ''}
    `);

    const total = Number(totalResult[0].count);

    return {
      data: jobs,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  }

  async findJobs(query: any) {
    const {
      filter,
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      lat,
      lng,
    } = query;

    // If geo available → use geo function
    if (lat && lng) {
      return this.findNearbyJobs(query);
    }

    const where: any = { isActive: true };

    if (filter) where.filterId = filter;
    if (search) where.description = Raw((alias) => `${alias} LIKE '%${search}%'`);

    const [jobs, total] = await this.jobRepo.findAndCount({
      where,
      order: { [sortBy]: sortOrder.toUpperCase() },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      data: jobs,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  }
}
