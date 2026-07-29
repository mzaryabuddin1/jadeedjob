import { User } from 'src/users/entities/user.entity';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
export declare class Rating {
    id: number;
    jobApplicationId: number;
    jobApplication: JobApplication;
    givenBy: number;
    rater: User;
    givenTo: number;
    ratedUser: User;
    side: 'worker' | 'employer';
    targetType: 'user' | 'company';
    targetUserId: number;
    targetUser: User;
    targetCompanyId: number;
    targetCompany: CompanyPage;
    legacyGrandfathered: boolean;
    stars: number;
    comment: string;
    createdAt: Date;
    updatedAt: Date;
}
