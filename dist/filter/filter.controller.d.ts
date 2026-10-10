import { FilterService } from './filter.service';
import { Repository } from 'typeorm';
import { Filter } from './entities/filter.entity';
import { AuthService } from 'src/auth/auth.service';
export declare class FilterController {
    private readonly filterService;
    private readonly authService;
    private filterRepo;
    constructor(filterService: FilterService, authService: AuthService, filterRepo: Repository<Filter>);
    createFilter(body: any, req: any): Promise<{
        message: string;
        filter: Filter;
    }>;
    getFilter(req: any, query: any): Promise<{
        data: Filter[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getFilterById(id: string): Promise<Filter>;
}
