import { JobApplicationService } from './job-application.service';
export declare class EmployerJobApplicationController {
    private readonly jobAppService;
    constructor(jobAppService: JobApplicationService);
    getJobApplications(params: any, query: any, req: any): Promise<{
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
            bidAmount: number;
            bidCurrency: string;
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
            chatId: string;
            conversationId: string;
            legacyApplicationChatId: number;
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
    updateJobApplicationStatus(params: any, body: any, req: any): Promise<{
        id: number;
        applicationId: number;
        jobId: number;
        applicantId: number;
        status: string;
        bidAmount: number;
        bidCurrency: string;
        chatId: string;
        conversationId: string;
        legacyApplicationChatId: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
