import { Repository } from 'typeorm';
import { Job } from './entities/job.entity';
import { User } from '../users/entities/user.entity';
import { FirebaseService } from '../firebase/firebase.service';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
export declare class JobService {
    private jobRepo;
    private userRepo;
    private pageRepo;
    private firebaseService;
    constructor(jobRepo: Repository<Job>, userRepo: Repository<User>, pageRepo: Repository<CompanyPage>, firebaseService: FirebaseService);
    createJob(data: any, userId: number): Promise<Job[]>;
    findNearbyJobs(query: any): Promise<{
        data: any;
        currentPage: number;
    }>;
    findJobs(query: any, userId?: number): Promise<{
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
            creator: User;
            applications: import("../job-application/entities/job-application.entity").JobApplication[];
            pageId?: number;
        }[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    findJobById(id: number): Promise<Job>;
}
