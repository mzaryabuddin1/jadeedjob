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
    } = payload;

    const radiusInKm = 1;
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
}
