import { UsersService } from './users.service';
import { Request } from 'express';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getMe(req: Request): Promise<{
        user: any;
        verificationRequirements: import("./profile-verification.util").VerificationRequirements;
    }>;
    updateMe(req: Request, body: any): Promise<{
        user: any;
        verificationRequirements: import("./profile-verification.util").VerificationRequirements;
        message: string;
    }>;
    uploadMyDocument(req: Request, file: Express.Multer.File, body: any): Promise<{
        user: any;
        verificationRequirements: import("./profile-verification.util").VerificationRequirements;
        message: string;
        fileName: string;
        fileUrl: string;
    }>;
    uploadMyCredentialDocument(req: Request, file: Express.Multer.File, body: {
        type: 'experience' | 'education' | 'certification';
        recordId: number;
    }): Promise<{
        user: any;
        verificationRequirements: import("./profile-verification.util").VerificationRequirements;
        message: string;
        fileName: string;
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
