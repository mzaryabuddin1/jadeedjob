import { Repository } from 'typeorm';
import { Job } from './entities/job.entity';
import { User } from '../users/entities/user.entity';
import { FirebaseService } from '../firebase/firebase.service';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { Filter } from 'src/filter/entities/filter.entity';
export declare class JobService {
    private jobRepo;
    private userRepo;
    private pageRepo;
    private filterRepo;
    private firebaseService;
    constructor(jobRepo: Repository<Job>, userRepo: Repository<User>, pageRepo: Repository<CompanyPage>, filterRepo: Repository<Filter>, firebaseService: FirebaseService);
    private toPointSql;
    private static readonly SORTABLE_COLUMNS;
    private safeSortColumn;
    private safeSortOrder;
    private parseFilterQuery;
    private toJobFilter;
    private jobCategories;
    private loadFiltersByJobIds;
    private resolveJobFilters;
    createJob(data: any, userId: number): Promise<{
        filter: {
            id: number;
            name: string;
            icon: import("src/filter/entities/filter.entity").FilterIcon;
        };
        filters: {
            id: number;
            name: string;
            icon: import("src/filter/entities/filter.entity").FilterIcon;
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
        creator: User;
        applications: import("../job-application/entities/job-application.entity").JobApplication[];
        pageId?: number;
        page?: CompanyPage;
    }>;
    findNearbyJobs(query: any): Promise<{
        data: any;
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    findJobs(query: any, userId?: number): Promise<{
        data: any;
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    findJobById(id: number): Promise<{
        filter: {
            id: number;
            name: string;
            icon: import("src/filter/entities/filter.entity").FilterIcon;
        };
        filters: {
            id: number;
            name: string;
            icon: import("src/filter/entities/filter.entity").FilterIcon;
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
        creator: User;
        applications: import("../job-application/entities/job-application.entity").JobApplication[];
        pageId?: number;
        page?: CompanyPage;
    }>;
    updateJob(id: number, data: any, userId: number): Promise<{
        filter: {
            id: number;
            name: string;
            icon: import("src/filter/entities/filter.entity").FilterIcon;
        };
        filters: {
            id: number;
            name: string;
            icon: import("src/filter/entities/filter.entity").FilterIcon;
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
        creator: User;
        applications: import("../job-application/entities/job-application.entity").JobApplication[];
        pageId?: number;
        page?: CompanyPage;
    }>;
}
