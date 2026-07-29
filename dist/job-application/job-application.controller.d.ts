import { JobApplicationService } from './job-application.service';
export declare class JobApplicationController {
    private readonly jobAppService;
    constructor(jobAppService: JobApplicationService);
    apply(body: any, idempotencyKey: string, req: any): Promise<{
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
    getMyApplications(req: any, page?: number, limit?: number, status?: any): Promise<{
        data: {
            applicationId: number;
            id: number;
            status: string;
            bidAmount: number;
            bidCurrency: string;
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
            chatId: string;
            conversationId: string;
            legacyApplicationChatId: number;
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getHistory(req: any, status?: string, page?: number, limit?: number): Promise<{
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
    getByJob(jobId: number): Promise<import("./entities/job-application.entity").JobApplication[]>;
    updateStatus(params: any, body: any, req: any): Promise<{
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
    withdraw(id: number, req: any): Promise<{
        message: string;
        application: {
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
        };
    }>;
}
