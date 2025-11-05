import { Filter } from './filter.schema';
import { Model } from 'mongoose';
import { Job } from 'src/job/job.schema';
export declare class FilterService {
    private readonly filterModel;
    private readonly jobModel;
    constructor(filterModel: Model<Filter>, jobModel: Model<Job>);
    createFilter(data: Partial<Filter>): Promise<Filter>;
    getFilters(query: any): Promise<{
        data: any[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    FilterById(id: string): Promise<Filter>;
}
