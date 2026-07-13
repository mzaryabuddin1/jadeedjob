import { JobApplicationService } from './job-application.service';
export declare class JobApplicationController {
    private readonly jobAppService;
    constructor(jobAppService: JobApplicationService);
    apply(body: any, req: any): Promise<import("./entities/job-application.entity").JobApplication>;
    getMyApplications(req: any, page?: number, limit?: number): Promise<{
        data: import("./entities/job-application.entity").JobApplication[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getReceivedByJob(params: any, query: any, req: any): Promise<{
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
    getByJob(jobId: number): Promise<import("./entities/job-application.entity").JobApplication[]>;
    updateStatus(params: any, body: any, req: any): Promise<import("./entities/job-application.entity").JobApplication>;
}
