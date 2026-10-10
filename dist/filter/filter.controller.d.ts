import { FilterService } from './filter.service';
import { AuthService } from 'src/auth/auth.service';
export declare class FilterController {
    private readonly filterService;
    private readonly authService;
    constructor(filterService: FilterService, authService: AuthService);
    getFilter(req: any, query: any): Promise<{
        last_update_time: string;
        data: {
            id: number;
            name: string;
            icon: import("./entities/filter.entity").FilterIcon;
            status: "active" | "inactive";
            approvalStatus: "pending" | "approved" | "rejected";
            createdAt: Date;
            updatedAt: Date;
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getFilterById(id: string): Promise<{
        last_update_time: string;
        filter: {
            id: number;
            name: string;
            icon: import("./entities/filter.entity").FilterIcon;
            status: "active" | "inactive";
            approvalStatus: "pending" | "approved" | "rejected";
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
}
