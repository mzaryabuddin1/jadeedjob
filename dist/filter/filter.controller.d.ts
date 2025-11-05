import { FilterService } from './filter.service';
import { Filter } from 'src/filter/filter.schema';
import { Model } from 'mongoose';
export declare class FilterController {
    private readonly filterService;
    private filterModel;
    constructor(filterService: FilterService, filterModel: Model<Filter>);
    createFilter(body: any, req: any): Promise<{
        message: string;
        filter: Filter;
    }>;
    getFilter(query: any): Promise<{
        data: any[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getCountryById(params: any): Promise<Filter>;
}
