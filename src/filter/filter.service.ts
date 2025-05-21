import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Filter } from './filter.schema';
import { Model, Types } from 'mongoose';

@Injectable()
export class FilterService {
  constructor(
    @InjectModel(Filter.name) private readonly filterModel: Model<Filter>,
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

    const total = await this.filterModel.countDocuments(filterCondition);
    const totalPages = Math.ceil(total / limit);

    let results;

    if (preference_ids.length > 0) {
      const objectIds = preference_ids.map(
        (id: string) => new Types.ObjectId(id),
      );

      const preferredResults = await this.filterModel
        .find({ ...filterCondition, _id: { $in: objectIds } })
        .sort(sortCondition);

      const remainingResults = await this.filterModel
        .find({ ...filterCondition, _id: { $nin: objectIds } })
        .sort(sortCondition)
        .skip(skip)
        .limit(limit - preferredResults.length);

      results = [...preferredResults, ...remainingResults].slice(0, limit);
    } else {
      results = await this.filterModel
        .find(filterCondition)
        .sort(sortCondition)
        .skip(skip)
        .limit(limit);
    }

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
