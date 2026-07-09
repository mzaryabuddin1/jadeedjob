import { Repository } from 'typeorm';
import { Filter, FilterIconLibrary, FilterIconSource } from './entities/filter.entity';
import { User } from 'src/users/entities/user.entity';
export declare class FilterService {
    private filterRepo;
    private userRepo;
    constructor(filterRepo: Repository<Filter>, userRepo: Repository<User>);
    private sanitizeInlineSvg;
    private normalizeIconData;
    private buildIconMeta;
    private withIconMeta;
    createFilter(data: any): Promise<{
        iconMeta: {
            source: string;
            svg: string;
            color: string;
            library?: undefined;
            name?: undefined;
        } | {
            source: string;
            library: FilterIconLibrary;
            name: string;
            color: string;
            svg?: undefined;
        };
        id: number;
        name: string;
        icon: string;
        iconSource: FilterIconSource;
        iconLibrary: FilterIconLibrary | null;
        iconName: string | null;
        iconColor: string;
        iconSvg: string | null;
        status: "active" | "inactive";
        approvalStatus: "pending" | "approved" | "rejected";
        rejectionReason: string;
        createdBy: number;
        creator: User;
        jobs: import("../job/entities/job.entity").Job[];
        createdAt: Date;
        updatedAt: Date;
    }>;
    getFilters(query: any, userId?: number): Promise<{
        data: {
            iconMeta: {
                source: string;
                svg: string;
                color: string;
                library?: undefined;
                name?: undefined;
            } | {
                source: string;
                library: FilterIconLibrary;
                name: string;
                color: string;
                svg?: undefined;
            };
            id: number;
            name: string;
            icon: string;
            iconSource: FilterIconSource;
            iconLibrary: FilterIconLibrary | null;
            iconName: string | null;
            iconColor: string;
            iconSvg: string | null;
            status: "active" | "inactive";
            approvalStatus: "pending" | "approved" | "rejected";
            rejectionReason: string;
            createdBy: number;
            creator: User;
            jobs: import("../job/entities/job.entity").Job[];
            createdAt: Date;
            updatedAt: Date;
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    filterById(id: number): Promise<{
        iconMeta: {
            source: string;
            svg: string;
            color: string;
            library?: undefined;
            name?: undefined;
        } | {
            source: string;
            library: FilterIconLibrary;
            name: string;
            color: string;
            svg?: undefined;
        };
        id: number;
        name: string;
        icon: string;
        iconSource: FilterIconSource;
        iconLibrary: FilterIconLibrary | null;
        iconName: string | null;
        iconColor: string;
        iconSvg: string | null;
        status: "active" | "inactive";
        approvalStatus: "pending" | "approved" | "rejected";
        rejectionReason: string;
        createdBy: number;
        creator: User;
        jobs: import("../job/entities/job.entity").Job[];
        createdAt: Date;
        updatedAt: Date;
    }>;
    getTopFiltersByJobs(limit?: number): Promise<number[]>;
}
