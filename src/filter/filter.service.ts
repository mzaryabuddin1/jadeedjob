import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Filter } from './filter.schema';
import { Model } from 'mongoose';

@Injectable()
export class FilterService {
  constructor(
    @InjectModel(Filter.name) private readonly filterModel: Model<Filter>,
  ) {}

  async createFilter(data: Partial<Filter>): Promise<Filter> {
    const filter = new this.filterModel(data);
    return filter.save();
  }
}
