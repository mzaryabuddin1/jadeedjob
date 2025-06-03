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

  async findNearbyJobs(
    lat: number,
    lng: number,
    page = 1,
    limit = 10,
    search?: string,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    const radiusInKm = 5;

    const skip = (page - 1) * limit;
    const maxLimit = Math.min(limit, 10); // Max 10 records

    const query: any = {
      isActive: true,
      location: {
        $geoWithin: {
          $centerSphere: [[lng, lat], radiusInKm / 6378.1], // Earth radius in km
        },
      },
    };

    if (search) {
      query.description = { $regex: search, $options: 'i' }; // case-insensitive search
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const jobs = await this.jobModel
      .find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(maxLimit);

    const total = await this.jobModel.countDocuments(query);

    return {
      page,
      limit: maxLimit,
      total,
      jobs,
    };
  }
}
