import { Repository } from 'typeorm';
import { Filter } from './entities/filter.entity';
import { User } from 'src/users/entities/user.entity';
export declare class FilterService {
    private filterRepo;
    private userRepo;
    constructor(filterRepo: Repository<Filter>, userRepo: Repository<User>);
    createFilter(data: any): Promise<Filter>;
    getFilters(query: any): Promise<{
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
            creator: User;
            createdAt: Date;
            updatedAt: Date;
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    filterById(id: number): Promise<Filter>;
}
