import { Repository } from 'typeorm';
import { Job } from './entities/job.entity';
import { User } from '../users/entities/user.entity';
import { FirebaseService } from '../firebase/firebase.service';
export declare class JobService {
    private jobRepo;
    private userRepo;
    private firebaseService;
    constructor(jobRepo: Repository<Job>, userRepo: Repository<User>, firebaseService: FirebaseService);
    createJob(data: any): Promise<Job[]>;
    findNearbyJobs(query: any): Promise<{
        data: any;
        total: number;
        totalPages: number;
        currentPage: any;
    }>;
    findJobs(query: any): Promise<{
        data: any;
        total: number;
        totalPages: number;
        currentPage: any;
    }>;
}
