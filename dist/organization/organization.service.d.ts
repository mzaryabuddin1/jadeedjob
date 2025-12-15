import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { OrgMember } from './entities/org-member.entity';
import { UsersService } from 'src/users/users.service';
export declare class OrganizationService {
    private readonly orgRepo;
    private readonly orgMemberRepo;
    private readonly usersService;
    constructor(orgRepo: Repository<Organization>, orgMemberRepo: Repository<OrgMember>, usersService: UsersService);
    createOrg(data: {
        name: string;
        industry: string;
        createdBy: number;
        username?: string;
        members?: {
            user: number;
            role: 'admin' | 'user';
        }[];
    }): Promise<Organization>;
    getMyOrganizations(userId: number): Promise<Organization[]>;
    addMember(orgId: number, member: {
        userId: number;
        role: 'admin' | 'user';
    }, requesterId: number): Promise<Organization>;
    removeMember(orgId: number, targetUserId: number, requesterId: number): Promise<{
        message: string;
    }>;
    private generateUniqueUsername;
    getOrganizations(options: {
        userId: number;
        mine?: boolean;
        search?: string;
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: 'ASC' | 'DESC';
    }): Promise<{
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
            members: OrgMember[];
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
}
