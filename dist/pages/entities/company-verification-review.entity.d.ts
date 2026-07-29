import { User } from 'src/users/entities/user.entity';
import { CompanyPage } from './company-page.entity';
export declare class CompanyVerificationReview {
    id: number;
    companyId: number;
    company: CompanyPage;
    actorUserId: number;
    actor: User;
    previousStatus: string;
    nextStatus: string;
    reason: string;
    submissionSnapshot: Record<string, unknown>;
    createdAt: Date;
}
