import { Repository } from 'typeorm';
import { Job } from './entities/job.entity';
import { User } from '../users/entities/user.entity';
import { NotificationService } from '../notification/notification.service';
import { Page } from 'src/pages/entities/page.entity';
import { Filter } from 'src/filter/entities/filter.entity';
export declare class JobService {
    private jobRepo;
    private userRepo;
    private pageRepo;
    private filterRepo;
    private notificationService;
    constructor(jobRepo: Repository<Job>, userRepo: Repository<User>, pageRepo: Repository<Page>, filterRepo: Repository<Filter>, notificationService: NotificationService);
    private toPointSql;
    private static readonly SORTABLE_COLUMNS;
    private safeSortColumn;
    private safeSortOrder;
    private parseFilterQuery;
    private toJobFilter;
    private slimPage;
    private jobCategories;
    private loadFiltersByJobIds;
    private resolveJobFilters;
    createJob(data: any, userId: number, opts?: {
        skipNotification?: boolean;
    }): Promise<{
        page: {
            id: number;
            page_name: string;
            username: string;
            page_logo: string;
            is_verified: boolean;
        };
        filters: {
            id: number;
            name: string;
            icon: import("src/filter/entities/filter.entity").FilterIcon;
        }[];
        filterIds?: number[];
        id: number;
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
        page: {
            id: number;
            page_name: string;
            username: string;
            page_logo: string;
            is_verified: boolean;
        };
        filters: {
            id: number;
            name: string;
            icon: import("src/filter/entities/filter.entity").FilterIcon;
        }[];
        filterIds: number[];
        id: number;
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
    }>;
    updateJob(id: number, data: any, userId: number): Promise<{
        page: {
            id: number;
            page_name: string;
            username: string;
            page_logo: string;
            is_verified: boolean;
        };
        filters: {
            id: number;
            name: string;
            icon: import("src/filter/entities/filter.entity").FilterIcon;
        }[];
        filterIds: number[];
        id: number;
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
    }>;
}
