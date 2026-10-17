import { User } from 'src/users/entities/user.entity';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
export type RatingDirection = 'employee_to_employer' | 'employer_to_employee';
export declare class Rating {
    id: number;
    jobApplicationId: number;
    jobApplication: JobApplication;
    givenBy: number;
    rater: User;
    givenTo: number | null;
    ratedUser: User;
    pageId: number | null;
    page: CompanyPage;
    direction: RatingDirection | null;
    stars: number;
    comment: string;
    createdAt: Date;
    updatedAt: Date;
}
