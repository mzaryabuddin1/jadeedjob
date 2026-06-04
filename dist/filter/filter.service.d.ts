import { Repository } from 'typeorm';
import { Filter } from './entities/filter.entity';
import { User } from 'src/users/entities/user.entity';
export declare class FilterService {
    private filterRepo;
    private userRepo;
    constructor(filterRepo: Repository<Filter>, userRepo: Repository<User>);
    createFilter(data: any): Promise<Filter>;
    getFilters(query: any, options?: {
        approvedOnly?: boolean;
        userId?: number;
    }): Promise<{
        data: Filter[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    filterById(id: number, options?: {
        approvedOnly?: boolean;
    }): Promise<Filter>;
    getTopFiltersByJobs(limit?: number): Promise<number[]>;
    seedFakeFilters(options?: {
        createdBy?: number;
        approve?: boolean;
    }): Promise<{
        created: Filter[];
        skipped: string[];
    }>;
}
