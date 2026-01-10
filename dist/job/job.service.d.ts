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
        total: number;
        totalPages: number;
        currentPage: any;
    }>;
    findJobs(query: any, userId?: number): Promise<{
        data: any;
        total: number;
        totalPages: number;
        currentPage: any;
    }>;
    findJobById(id: number): Promise<Job>;
}
