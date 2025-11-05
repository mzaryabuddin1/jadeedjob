import { Organization } from './organization.schema';
import { Model, Types } from 'mongoose';
import { UsersService } from 'src/users/users.service';
export declare class OrganizationService {
    private readonly orgModel;
    private readonly usersService;
    constructor(orgModel: Model<Organization>, usersService: UsersService);
    createOrg(data: {
        name: string;
        industry: string;
        createdBy: Types.ObjectId;
        members?: {
            user: Types.ObjectId;
            role: 'admin' | 'user';
        }[];
    }): Promise<import("mongoose").Document<unknown, {}, Organization, {}> & Organization & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    getMyOrganizations(userId: string): Promise<(import("mongoose").Document<unknown, {}, Organization, {}> & Organization & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    addMember(orgId: string, member: {
        user: string;
        role: 'admin' | 'user';
    }, requesterId: string): Promise<{
        message: string;
        organization: import("mongoose").Document<unknown, {}, Organization, {}> & Organization & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
    }>;
}
