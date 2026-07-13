import { UsersService } from './users.service';
import { Request } from 'express';
import { AuthService } from 'src/auth/auth.service';
export declare class UsersController {
    private readonly usersService;
    private readonly authService;
    constructor(usersService: UsersService, authService: AuthService);
    getMe(req: Request): Promise<{
        user: any;
    }>;
    updateMe(req: Request, body: any): Promise<{
        message: string;
        user: any;
    }>;
    getMyPreferences(req: any): Promise<{
        data: number[];
        filters: {
            iconMeta: import("../filter/filter-icon.util").FilterIconMeta;
            id: number;
            name: string;
            icon: string;
            iconSource: import("../filter/entities/filter.entity").FilterIconSource;
            iconLibrary: import("../filter/entities/filter.entity").FilterIconLibrary | null;
            iconName: string | null;
            iconColor: string;
            iconSvg: string | null;
            status: "active" | "inactive";
            approvalStatus: "pending" | "approved" | "rejected";
            rejectionReason: string;
            createdBy: number;
            creator: import("./entities/user.entity").User;
            jobs: import("../job/entities/job.entity").Job[];
            createdAt: Date;
            updatedAt: Date;
        }[];
    }>;
}
