import { Repository } from 'typeorm';
import { JobApplication } from './entities/job-application.entity';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import { Rating } from 'src/rating/entities/rating.entity';
import { PageMember } from 'src/pages/entities/page-member.entity';
import { NotificationsService } from 'src/notifications/notifications.service';
type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'completed';
type ReceivedApplicationsQuery = {
    status?: ApplicationStatus | 'all';
    page?: number;
    limit?: number;
};
export declare class JobApplicationService {
    private jobAppRepo;
    private jobRepo;
    private userRepo;
    private ratingRepo;
    private pageMemberRepo;
    private notificationsService;
    constructor(jobAppRepo: Repository<JobApplication>, jobRepo: Repository<Job>, userRepo: Repository<User>, ratingRepo: Repository<Rating>, pageMemberRepo: Repository<PageMember>, notificationsService: NotificationsService);
    private formatDemand;
    private getApplicantName;
    private getEmployerName;
    private getJobSummary;
    private getEmployerSummary;
    private canManageJob;
    apply(data: {
        jobId: number;
        applicantId: number;
    }): Promise<JobApplication>;
    getApplicationsByUser(userId: number, page?: number, limit?: number, status?: ApplicationStatus | 'all'): Promise<{
        data: {
            applicationId: number;
            id: number;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            job: {
                id: number;
                title: string;
                description: string;
                salaryType: string;
                salaryAmount: number;
                currency: string;
                filter: import("../filter/entities/filter.entity").Filter;
                companyName: string;
                employerName: string;
                employerType: string;
                status: "active" | "draft" | "closed";
                payType: string;
            };
            employer: {
                id: number;
                type: string;
                companyId: number;
                name: string;
                companyName: string;
                logoUrl: string;
            };
            chatId: number;
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getApplicationHistory(userId: number, status?: ApplicationStatus, page?: number, limit?: number): Promise<{
        data: {
            id: number;
            applicationId: number;
            jobTitle: string;
            amount: number;
            description: string;
            completedAt: Date;
            status: string;
            employer: {
                id: number;
                type: string;
                companyId: number;
                name: string;
                companyName: string;
                logoUrl: string;
            };
            paymentStatus: string;
        }[];
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
            chatId: number;
            createdAt: Date;
            updatedAt: Date;
        }[];
        counts: {
            pending: number;
            accepted: number;
            rejected: number;
            withdrawn: number;
            completed: number;
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
            companyName: string;
            employerName: string;
            employerType: string;
            status: "active" | "draft" | "closed";
            payType: string;
        };
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    updateStatus(id: number, status: ApplicationStatus, employerId: number): Promise<JobApplication>;
    withdraw(id: number, applicantId: number): Promise<{
        message: string;
        application: JobApplication;
    }>;
}
export {};
