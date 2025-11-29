import { Repository } from 'typeorm';
import { Rating } from './entities/rating.entity';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { User } from 'src/users/entities/user.entity';
export declare class RatingService {
    private readonly ratingRepo;
    private readonly appRepo;
    private readonly userRepo;
    constructor(ratingRepo: Repository<Rating>, appRepo: Repository<JobApplication>, userRepo: Repository<User>);
    rateUser(raterId: number, jobApplicationId: number, stars: number, comment: string): Promise<{
        message: string;
        rating: Rating;
    }>;
    updateUserRatingStats(userId: number): Promise<void>;
}
