import { JobService } from './job.service';
import { FilesService } from 'src/files/files.service';
export declare class JobController {
    private readonly jobService;
    private readonly filesService;
    constructor(jobService: JobService, filesService: FilesService);
    createJob(files: Express.Multer.File[] | undefined, body: any, req: any): Promise<{
        filter: {
            id: number;
            name: string;
            icon: import("../filter/entities/filter.entity").FilterIcon;
        };
        filters: {
            id: number;
            name: string;
            icon: import("../filter/entities/filter.entity").FilterIcon;
        }[];
        filterIds?: number[];
        id: number;
        filterId: number;
        title: string;
        description: string | null;
        pictures: string[] | null;
        isRemote: boolean;
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
        page?: import("../pages/entities/company-page.entity").CompanyPage;
    }>;
    findJobs(query: any, req: any): Promise<{
        data: any;
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    findJob(id: number): Promise<{
        filter: {
            id: number;
            name: string;
            icon: import("../filter/entities/filter.entity").FilterIcon;
        };
        filters: {
            id: number;
            name: string;
            icon: import("../filter/entities/filter.entity").FilterIcon;
        }[];
        filterIds: number[];
        id: number;
        filterId: number;
        title: string;
        description: string | null;
        pictures: string[] | null;
        isRemote: boolean;
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
        page?: import("../pages/entities/company-page.entity").CompanyPage;
    }>;
    patchJob(id: number, files: Express.Multer.File[], body: any, req: any): Promise<{
        filter: {
            id: number;
            name: string;
            icon: import("../filter/entities/filter.entity").FilterIcon;
        };
        filters: {
            id: number;
            name: string;
            icon: import("../filter/entities/filter.entity").FilterIcon;
        }[];
        filterIds: number[];
        id: number;
        filterId: number;
        title: string;
        description: string | null;
        pictures: string[] | null;
        isRemote: boolean;
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
        page?: import("../pages/entities/company-page.entity").CompanyPage;
    }>;
}
