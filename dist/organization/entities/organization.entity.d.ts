import { User } from 'src/users/entities/user.entity';
import { OrgMember } from './org-member.entity';
export declare class Organization {
    id: number;
    name: string;
    industry: string;
    isActive: string;
    createdBy: number;
    creator: User;
    createdAt: Date;
    members: OrgMember[];
}
