import { Organization } from './organization.entity';
import { User } from 'src/users/entities/user.entity';
export declare class OrgMember {
    id: number;
    organizationId: number;
    userId: number;
    role: 'owner' | 'admin' | 'user';
    organization: Organization;
    user: User;
}
