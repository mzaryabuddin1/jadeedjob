import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/users.service';
export declare class OrganizationService {
    private readonly prisma;
    private readonly usersService;
    constructor(prisma: PrismaService, usersService: UsersService);
    createOrg(data: {
        name: string;
        industry: string;
        createdBy: number;
        members?: {
            user: number;
            role: 'admin' | 'user';
        }[];
    }): Promise<any>;
    getMyOrganizations(userId: number): Promise<any>;
    addMember(orgId: number, member: {
        userId: number;
        role: 'admin' | 'user';
    }, requesterId: number): Promise<{
        message: string;
        organization: any;
    }>;
}
