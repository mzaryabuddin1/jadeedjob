import { User } from 'src/users/entities/user.entity';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
export declare class Rating {
    id: number;
    jobApplicationId: number;
    jobApplication: JobApplication;
    givenBy: number;
    rater: User;
    givenTo: number;
    ratedUser: User;
    stars: number;
    comment: string;
    createdAt: Date;
    updatedAt: Date;
}
