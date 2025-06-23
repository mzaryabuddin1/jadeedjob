import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from './job.schema';
import { Model } from 'mongoose';

@Injectable()
export class JobService {
  constructor(@InjectModel(Job.name) private readonly jobModel: Model<Job>) {}

  async createJob(payload: any): Promise<Job> {
    const job = new this.jobModel(payload);
    return job.save();
  }

  async findNearbyJobs(payload: any) {
    const {
      lat,
      lng,
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      radiusKm = 1,
    } = payload;

    const radiusInKm = radiusKm;
    const skip = (page - 1) * limit;
    const maxLimit = Math.min(limit, 10); // Max 10 records per page

    const query: any = {
      isActive: true,
      location: {
        $geoWithin: {
          $centerSphere: [[lng, lat], radiusInKm / 6378.1],
        },
      },
    };

    if (search) {
      query.description = { $regex: search, $options: 'i' };
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const jobs = await this.jobModel
      .find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(maxLimit);

    const total = await this.jobModel.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    return {
      data: jobs,
      total,
      totalPages,
      currentPage: page,
    };
  }

  async findJobs(query: any) {
    const {
      filter,
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt', // optional fallback if no geo sort
      sortOrder = 'desc',
      lat,
      lng,
    } = query;

    const skip = (page - 1) * limit;
    const maxLimit = Math.min(limit, 10);

    const conditions: any = {
      isActive: true,
    };

    if (filter) {
      conditions.filter = filter;
    }

    if (search) {
      conditions.description = { $regex: search, $options: 'i' };
    }

    const pipeline: any[] = [];

    // 🔁 Geo sort stage if lat/lng present
    if (lat && lng) {
      pipeline.push({
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [+lng, +lat],
          },
          distanceField: 'distance',
          spherical: true,
          query: conditions,
        },
      });
    } else {
      // If no geo sort, filter using $match
      pipeline.push({ $match: conditions });
    }

    // 🔁 Sort stage (if needed and not geo-based)
    if (!lat || !lng) {
      pipeline.push({
        $sort: {
          [sortBy]: sortOrder === 'asc' ? 1 : -1,
        },
      });
    }

    // Count stage (total)
    const countPipeline = [...pipeline, { $count: 'total' }];

    // Pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: maxLimit });

    // Query data and total in parallel
    const [jobs, countResult] = await Promise.all([
      this.jobModel.aggregate(pipeline),
      this.jobModel.aggregate(countPipeline),
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / maxLimit);

    return {
      data: jobs,
      total,
      totalPages,
      currentPage: page,
    };
  }
}
