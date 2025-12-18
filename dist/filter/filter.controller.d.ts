import { FilterService } from './filter.service';
import { Repository } from 'typeorm';
import { Filter } from './entities/filter.entity';
export declare class FilterController {
    private readonly filterService;
    private filterRepo;
    constructor(filterService: FilterService, filterRepo: Repository<Filter>);
    createFilter(body: any, req: any): Promise<{
        message: string;
        filter: Filter;
    }>;
    getFilter(query: any): Promise<{
        data: Filter[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getFilterById(params: any): Promise<Filter>;
    seedFilters(req: any): Promise<{
        message: string;
        count: number;
        filters: any[];
    }>;
}
