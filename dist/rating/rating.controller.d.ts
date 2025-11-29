import { RatingService } from './rating.service';
export declare class RatingController {
    private readonly ratingService;
    constructor(ratingService: RatingService);
    rate(body: any, req: any): Promise<{
        message: string;
        rating: import("./entities/rating.entity").Rating;
    }>;
}
