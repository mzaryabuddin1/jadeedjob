import { Repository } from 'typeorm';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { PageMember } from 'src/pages/entities/page-member.entity';
import { User } from 'src/users/entities/user.entity';
import { Rating } from './entities/rating.entity';
export declare class RatingService {
    private readonly ratingRepo;
    private readonly appRepo;
    private readonly userRepo;
    private readonly companyRepo;
    private readonly memberRepo;
    constructor(ratingRepo: Repository<Rating>, appRepo: Repository<JobApplication>, userRepo: Repository<User>, companyRepo: Repository<CompanyPage>, memberRepo: Repository<PageMember>);
    rateUser(raterId: number, jobApplicationId: number, stars: number, comment: string): Promise<{
        message: string;
        rating: {
            id: number;
            applicationId: number;
            side: "worker" | "employer";
            targetType: "user" | "company";
            targetId: string;
            stars: number;
            comment: string;
            createdAt: Date;
            legacyGrandfathered: boolean;
        };
    }>;
    getMine(applicationId: number, userId: number): Promise<{
        applicationId: number;
        side: "worker" | "employer";
        target: {
            type: "user" | "company";
            id: string;
        };
        canRate: boolean;
        rating: {
            id: number;
            applicationId: number;
            side: "worker" | "employer";
            targetType: "user" | "company";
            targetId: string;
            stars: number;
            comment: string;
            createdAt: Date;
            legacyGrandfathered: boolean;
        };
    }>;
    private loadApplication;
    private resolveRatingContext;
    private canRateAsEmployer;
    private updateAggregate;
    private formatRating;
}
