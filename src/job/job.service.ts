import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class JobService {
  constructor(private prisma: PrismaService) {}

  async createJob(data: any) {
    const { location, ...rest } = data;

    return this.prisma.job.create({
      data: {
        ...rest,
        location: `POINT(${location.lng} ${location.lat})`,
      },
    });
  }

  async findNearbyJobs(query: any) {
    const {
      lat,
      lng,
      page = 1,
      limit = 10,
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      radiusKm = 1,
    } = query;

    const skip = (page - 1) * limit;

    const jobs = await this.prisma.$queryRawUnsafe(`
      SELECT *,
        ST_Distance(
          location,
          ST_SetSRID(ST_Point(${lng}, ${lat}), 4326)
        ) AS distance
      FROM "Job"
      WHERE ST_DWithin(
        location,
        ST_SetSRID(ST_Point(${lng}, ${lat}), 4326),
        ${radiusKm * 1000}
      )
      AND "isActive" = true
      ${search ? `AND description ILIKE '%${search}%'` : ''}
      ORDER BY "${sortBy}" ${sortOrder}
      LIMIT ${limit}
      OFFSET ${skip}
    `);

    const totalResult: any = await this.prisma.$queryRawUnsafe(`
      SELECT COUNT(*) FROM "Job"
      WHERE ST_DWithin(
        location,
        ST_SetSRID(ST_Point(${lng}, ${lat}), 4326),
        ${radiusKm * 1000}
      )
      AND "isActive" = true
      ${search ? `AND description ILIKE '%${search}%'` : ''}
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
      sortOrder = 'desc',
      lat,
      lng,
    } = query;

    const skip = (page - 1) * limit;

    // If lat/lng provided → geo distance sorted
    if (lat && lng) {
      return this.findNearbyJobs({
        lat,
        lng,
        filter,
        page,
        limit,
        search,
        sortBy,
        sortOrder,
      });
    }

    // No geo → use Prisma query
    const where: any = { isActive: true };

    if (filter) where.filterId = Number(filter);
    if (search) where.description = { contains: search, mode: 'insensitive' };

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      data: jobs,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  }
}
