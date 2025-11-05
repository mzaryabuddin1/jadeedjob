import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Filter } from './filter.schema';
import { Model, Types } from 'mongoose';
import { Job } from 'src/job/job.schema';

@Injectable()
export class FilterService {
  constructor(
    @InjectModel(Filter.name) private readonly filterModel: Model<Filter>,
    @InjectModel(Job.name) private readonly jobModel: Model<Job>, // ✅ Add this
  ) {}

  async createFilter(data: Partial<Filter>): Promise<Filter> {
    const filter = new this.filterModel(data);
    return filter.save();
  }

  async getFilters(query: any) {
    const {
      page = 1,
      limit = 20,
      search,
      preference_ids = [],
      sortBy = 'createdAt',
      sortOrder = 'desc',
      approvalStatus = null,
    } = query;

    const filterCondition: any = {};
    if (search) {
      filterCondition.name = { $regex: search, $options: 'i' };
    }
    if (approvalStatus) {
      filterCondition.approvalStatus = approvalStatus;
    }

    const sortCondition: Record<string, 1 | -1> = {};
    sortCondition[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    // ✅ Convert preference_ids to ObjectIds if provided
    const preferenceObjectIds =
      preference_ids?.length > 0
        ? preference_ids.map((id: string) => new Types.ObjectId(id))
        : [];

    // ✅ Count total filters
    const total = await this.filterModel.countDocuments(filterCondition);
    const totalPages = Math.ceil(total / limit);

    // ✅ Base query aggregation
    const baseQuery = this.filterModel.aggregate([
      { $match: filterCondition },
      {
        $lookup: {
          from: 'jobs',
          let: { filterId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$filter', '$$filterId'] } } },
            { $match: { isActive: true } },
          ],
          as: 'jobs',
        },
      },
      {
        $addFields: {
          jobCount: { $size: '$jobs' },
          isPreferred: {
            $in: ['$_id', preferenceObjectIds], // ✅ tag if it's in the preferred list
          },
        },
      },
      { $project: { jobs: 0 } },
      { $sort: sortCondition },
      { $skip: skip },
      { $limit: limit },
    ]);

    const results = await baseQuery.exec();

    return {
      data: results,
      total,
      totalPages,
      currentPage: Number(page),
    };
  }

  async FilterById(id: string): Promise<Filter> {
    const filter = await this.filterModel.findById(id).exec();
    if (!filter) {
      throw new NotFoundException('Filter not found');
    }
    return filter;
  }
}
