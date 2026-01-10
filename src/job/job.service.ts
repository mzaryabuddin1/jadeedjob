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

@Injectable()
export class JobService {
  constructor(
    @InjectRepository(Job)
    private jobRepo: Repository<Job>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    private firebaseService: FirebaseService,
  ) {}

  // ────────────────────────────────────────────────
  // CREATE JOB + SEND NOTIFICATION
  // ────────────────────────────────────────────────
  async createJob(data: any) {
    const { location, ...rest } = data;

    const job = this.jobRepo.create({
      ...rest,
      location: () =>
        `ST_GeomFromText('POINT(${location.lng} ${location.lat})')`,
    });

    // Save job first so it has ID
    const savedJob = await this.jobRepo.save(job);

    // FCM
    // const users = await this.userRepo.find({
    //   where: { fcmToken: Not(IsNull()) },
    // });
    // const tokens = users.map((u) => u.fcmToken).filter(Boolean);
    // if (tokens.length > 0) {
    //   await this.firebaseService.sendNotification(
    //     tokens,
    //     'New Job Posted',
    //     "Descriptin",
    //   );
    // }

    return savedJob;
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

    const jobs = await this.jobRepo.query(`
      SELECT 
        j.*, 
        ST_Distance_Sphere(j.location, POINT(${lng}, ${lat})) AS distance
      FROM jobs j
      WHERE j.isActive = 1
      AND ST_Distance_Sphere(j.location, POINT(${lng}, ${lat})) <= ${radiusMeters}
      ${search ? `AND j.description LIKE '%${search}%'` : ''}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    const countResult = await this.jobRepo.query(`
      SELECT COUNT(*) AS count
      FROM jobs j
      WHERE j.isActive = 1
      AND ST_Distance_Sphere(j.location, POINT(${lng}, ${lat})) <= ${radiusMeters}
      ${search ? `AND j.description LIKE '%${search}%'` : ''}
    `);

    const total = Number(countResult[0].count);

    return {
      data: jobs,
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
      order: { [sortBy]: sortOrder.toUpperCase() },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      data: jobs,
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
