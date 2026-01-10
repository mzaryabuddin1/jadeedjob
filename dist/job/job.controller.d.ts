import { JobService } from './job.service';
export declare class JobController {
    private readonly jobService;
    constructor(jobService: JobService);
    createJob(body: any, req: any): Promise<import("./entities/job.entity").Job[]>;
    findJobs(query: any, req: any): Promise<{
        data: any;
        currentPage: number;
    } | {
        data: {
            pageTaggedJob: boolean;
            page: {
                id: number;
                company_name: string;
                username: string;
                company_logo: string;
            };
            id: number;
            filter: import("../filter/entities/filter.entity").Filter;
            filterId: number;
            title: string;
            description: string;
            requirements: string;
            benefits: string[];
            shifts: string[];
            jobTypes: string[];
            salaryType: string;
            salaryAmount: number;
            currency: string;
            location: {
                lat: number;
                lng: number;
            };
            startDate: Date;
            endDate: Date;
            industry: string;
            educationLevel: string;
            experienceRequired: string;
            languageRequirements: string[];
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            createdBy: number;
            creator: import("../users/entities/user.entity").User;
            applications: import("../job-application/entities/job-application.entity").JobApplication[];
            pageId?: number;
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    findJob(id: number): Promise<import("./entities/job.entity").Job>;
}
