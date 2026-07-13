import { Repository } from 'typeorm';
import { JobApplication } from './entities/job-application.entity';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import { Rating } from 'src/rating/entities/rating.entity';
type ReceivedApplicationsQuery = {
    status?: 'pending' | 'accepted' | 'rejected' | 'all';
    page?: number;
    limit?: number;
};
export declare class JobApplicationService {
    private jobAppRepo;
    private jobRepo;
    private userRepo;
    private ratingRepo;
    constructor(jobAppRepo: Repository<JobApplication>, jobRepo: Repository<Job>, userRepo: Repository<User>, ratingRepo: Repository<Rating>);
    private formatDemand;
    private getApplicantName;
    private getJobSummary;
    apply(data: {
        jobId: number;
        applicantId: number;
    }): Promise<JobApplication>;
    getApplicationsByUser(userId: number, page?: number, limit?: number): Promise<{
        data: JobApplication[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getApplicationsByJob(jobId: number): Promise<JobApplication[]>;
    getReceivedApplicationsForJob(jobId: number, employerId: number, query?: ReceivedApplicationsQuery): Promise<{
        data: {
            id: number;
            jobApplicationId: number;
            jobId: number;
            applicantId: number;
            name: string;
            avatarUrl: string;
            demand: string;
            rating: number;
            ratingCount: number;
            status: string;
            lastReview: {
                stars: number;
                comment: string;
            };
            applicant: {
                id: number;
                firstName: string;
                lastName: string;
                full_name: string;
                profile_photo: string;
                city: string;
                ratingAverage: number;
                ratingCount: number;
            };
            createdAt: Date;
            updatedAt: Date;
        }[];
        counts: {
            pending: number;
            accepted: number;
            rejected: number;
            all: number;
        };
        job: {
            id: number;
            title: string;
            description: string;
            salaryType: string;
            salaryAmount: number;
            currency: string;
            filter: import("../filter/entities/filter.entity").Filter;
        };
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    updateStatus(id: number, status: string, employerId: number): Promise<JobApplication>;
}
export {};
