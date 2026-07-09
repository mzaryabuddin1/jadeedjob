import { FilterService } from './filter.service';
import { Repository } from 'typeorm';
import { Filter } from './entities/filter.entity';
export declare class FilterController {
    private readonly filterService;
    private filterRepo;
    constructor(filterService: FilterService, filterRepo: Repository<Filter>);
    createFilter(body: any, req: any): Promise<{
        message: string;
        filter: {
            iconMeta: {
                source: string;
                svg: string;
                color: string;
                library?: undefined;
                name?: undefined;
            } | {
                source: string;
                library: import("./entities/filter.entity").FilterIconLibrary;
                name: string;
                color: string;
                svg?: undefined;
            };
            id: number;
            name: string;
            icon: string;
            iconSource: import("./entities/filter.entity").FilterIconSource;
            iconLibrary: import("./entities/filter.entity").FilterIconLibrary | null;
            iconName: string | null;
            iconColor: string;
            iconSvg: string | null;
            status: "active" | "inactive";
            approvalStatus: "pending" | "approved" | "rejected";
            rejectionReason: string;
            createdBy: number;
            creator: import("../users/entities/user.entity").User;
            jobs: import("../job/entities/job.entity").Job[];
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    getFilter(query: any): Promise<{
        data: {
            iconMeta: {
                source: string;
                svg: string;
                color: string;
                library?: undefined;
                name?: undefined;
            } | {
                source: string;
                library: import("./entities/filter.entity").FilterIconLibrary;
                name: string;
                color: string;
                svg?: undefined;
            };
            id: number;
            name: string;
            icon: string;
            iconSource: import("./entities/filter.entity").FilterIconSource;
            iconLibrary: import("./entities/filter.entity").FilterIconLibrary | null;
            iconName: string | null;
            iconColor: string;
            iconSvg: string | null;
            status: "active" | "inactive";
            approvalStatus: "pending" | "approved" | "rejected";
            rejectionReason: string;
            createdBy: number;
            creator: import("../users/entities/user.entity").User;
            jobs: import("../job/entities/job.entity").Job[];
            createdAt: Date;
            updatedAt: Date;
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getFilterById(params: any): Promise<{
        iconMeta: {
            source: string;
            svg: string;
            color: string;
            library?: undefined;
            name?: undefined;
        } | {
            source: string;
            library: import("./entities/filter.entity").FilterIconLibrary;
            name: string;
            color: string;
            svg?: undefined;
        };
        id: number;
        name: string;
        icon: string;
        iconSource: import("./entities/filter.entity").FilterIconSource;
        iconLibrary: import("./entities/filter.entity").FilterIconLibrary | null;
        iconName: string | null;
        iconColor: string;
        iconSvg: string | null;
        status: "active" | "inactive";
        approvalStatus: "pending" | "approved" | "rejected";
        rejectionReason: string;
        createdBy: number;
        creator: import("../users/entities/user.entity").User;
        jobs: import("../job/entities/job.entity").Job[];
        createdAt: Date;
        updatedAt: Date;
    }>;
    seedFilters(req: any): Promise<{
        message: string;
        count: number;
        filters: any[];
    }>;
}
