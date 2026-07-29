import { RatingService } from './rating.service';
export declare class RatingController {
    private readonly ratingService;
    constructor(ratingService: RatingService);
    rate(body: any, req: any): Promise<{
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
    getMine(applicationId: number, req: any): Promise<{
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
}
