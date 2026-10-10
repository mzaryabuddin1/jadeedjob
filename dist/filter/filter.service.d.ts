import { Repository } from 'typeorm';
import { Filter, FilterIcon } from './entities/filter.entity';
import { User } from 'src/users/entities/user.entity';
export declare class FilterService {
    private filterRepo;
    private userRepo;
    constructor(filterRepo: Repository<Filter>, userRepo: Repository<User>);
    getLastUpdateTime(options?: {
        approvedOnly?: boolean;
    }): Promise<string | null>;
    toPublicFilter(filter: Filter): {
        id: number;
        name: string;
        icon: FilterIcon;
        status: "active" | "inactive";
        approvalStatus: "pending" | "approved" | "rejected";
        createdAt: Date;
        updatedAt: Date;
    };
    normalizeIcon(icon: FilterIcon | string | null | undefined): FilterIcon;
    getFilters(query: any, options?: {
        approvedOnly?: boolean;
        userId?: number;
    }): Promise<{
        last_update_time: string;
        data: {
            id: number;
            name: string;
            icon: FilterIcon;
            status: "active" | "inactive";
            approvalStatus: "pending" | "approved" | "rejected";
            createdAt: Date;
            updatedAt: Date;
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    filterById(id: number, options?: {
        approvedOnly?: boolean;
    }): Promise<{
        last_update_time: string;
        filter: {
            id: number;
            name: string;
            icon: FilterIcon;
            status: "active" | "inactive";
            approvalStatus: "pending" | "approved" | "rejected";
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    getTopFiltersByJobs(limit?: number): Promise<number[]>;
    seedFakeFilters(options?: {
        createdBy?: number;
        approve?: boolean;
        updateIcons?: boolean;
    }): Promise<{
        created: Filter[];
        updated: Filter[];
        skipped: string[];
    }>;
}
