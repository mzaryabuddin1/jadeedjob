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
}
