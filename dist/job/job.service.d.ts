import { Repository } from 'typeorm';
import { Job } from './entities/job.entity';
export declare class JobService {
    private jobRepo;
    constructor(jobRepo: Repository<Job>);
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
