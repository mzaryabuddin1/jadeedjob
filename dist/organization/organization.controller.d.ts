import { OrganizationService } from './organization.service';
export declare class OrganizationController {
    private readonly orgService;
    constructor(orgService: OrganizationService);
    create(body: any, req: any): Promise<import("./entities/organization.entity").Organization>;
    addMember(body: any, req: any): Promise<import("./entities/organization.entity").Organization>;
    removeMember(body: any, req: any): Promise<{
        message: string;
    }>;
    getOrganizations(req: any, mine?: string, search?: string, page?: number, limit?: number, sortBy?: string, sortOrder?: string): Promise<{
        data: {
            mine: boolean;
            id: number;
            name: string;
            username: string;
            industry: string;
            isActive: string;
            createdBy: number;
            creator: import("../users/entities/user.entity").User;
            createdAt: Date;
            members: import("./entities/org-member.entity").OrgMember[];
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
}
