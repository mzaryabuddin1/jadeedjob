import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Rating } from './entities/rating.entity';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { User } from 'src/users/entities/user.entity';
import { Page } from 'src/pages/entities/page.entity';
export declare class RatingService implements OnModuleInit {
    private readonly ratingRepo;
    private readonly appRepo;
    private readonly userRepo;
    private readonly pageRepo;
    constructor(ratingRepo: Repository<Rating>, appRepo: Repository<JobApplication>, userRepo: Repository<User>, pageRepo: Repository<Page>);
    onModuleInit(): Promise<void>;
    rateUser(raterId: number, jobApplicationId: number, stars: number, comment: string): Promise<{
        message: string;
        rating: Rating;
        ratedEntity: {
            type: string;
            pageId: number;
            userId?: undefined;
        } | {
            type: string;
            userId: number;
            pageId?: undefined;
        };
    }>;
    private directionFor;
    updateUserRatingStats(userId: number): Promise<void>;
    updatePageRatingStats(pageId: number): Promise<void>;
    getUserSummary(userId: number, limit?: number): Promise<{
        user: {
            id: number;
            name: string;
            username: string;
            profile_photo: string;
        };
        average: number;
        count: number;
        asEmployee: {
            average: number;
            count: number;
        };
        asEmployer: {
            average: number;
            count: number;
        };
        recent: {
            id: any;
            stars: number;
            comment: any;
            ratedAs: string;
            jobTitle: any;
            from: {
                id: any;
                name: string;
                username: any;
            };
            createdAt: any;
        }[];
    }>;
    getPageSummary(pageId: number, limit?: number): Promise<{
        page: {
            id: number;
            name: string;
            username: string;
            logo: string;
        };
        average: number;
        count: number;
        recent: {
            id: any;
            stars: number;
            comment: any;
            ratedAs: string;
            jobTitle: any;
            from: {
                id: any;
                name: string;
                username: any;
            };
            createdAt: any;
        }[];
    }>;
    getApplicationRatingState(applicationId: number, userId: number): Promise<{
        applicationId: number;
        status: string;
        myRole: string;
        willRate: {
            type: string;
            userId: number;
            pageId?: undefined;
        } | {
            type: string;
            pageId: number;
            userId?: undefined;
        };
        canRate: boolean;
        iRated: boolean;
        otherSideRated: boolean;
        reason: string;
    }>;
    private recent;
}
