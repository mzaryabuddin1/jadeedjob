import { User } from 'src/users/entities/user.entity';
import { CompanyPage } from './company-page.entity';
export declare class CompanyAccessRequest {
    id: number;
    companyId: number;
    company: CompanyPage;
    userId: number;
    user: User;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    message: string;
    requestedRole: 'admin' | 'editor';
    reviewReason: string;
    reviewedByUserId: number;
    reviewedBy: User;
    reviewedAt: Date;
    clientRequestId: string;
    createdAt: Date;
    updatedAt: Date;
}
