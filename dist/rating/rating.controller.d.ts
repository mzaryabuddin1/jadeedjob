import { RatingService } from './rating.service';
export declare class RatingController {
    private readonly ratingService;
    constructor(ratingService: RatingService);
    rate(body: any, req: any): Promise<{
        message: string;
        rating: import("./entities/rating.entity").Rating;
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
    applicationState(applicationId: number, req: any): Promise<{
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
    userSummary(userId: number, limit?: string): Promise<{
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
    companySummary(pageId: number, limit?: string): Promise<{
        company: {
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
}
