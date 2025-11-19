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
        data: {
            jobCount: number;
            isPreferred: any;
            jobs: any;
            id: number;
            name: string;
            icon: string;
            status: "active" | "inactive";
            approvalStatus: "pending" | "approved" | "rejected";
            rejectionReason: string;
            createdBy: number;
            creator: import("../users/entities/user.entity").User;
            createdAt: Date;
            updatedAt: Date;
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getFilterById(params: any): Promise<Filter>;
}
