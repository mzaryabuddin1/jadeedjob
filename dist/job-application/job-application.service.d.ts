import { Repository } from 'typeorm';
import { JobApplication } from './entities/job-application.entity';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
export declare class JobApplicationService {
    private jobAppRepo;
    private jobRepo;
    private userRepo;
    constructor(jobAppRepo: Repository<JobApplication>, jobRepo: Repository<Job>, userRepo: Repository<User>);
    apply(data: {
        jobId: number;
        applicantId: number;
    }): Promise<JobApplication>;
    getApplicationsByUser(userId: number, page?: number, limit?: number): Promise<{
        data: JobApplication[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getApplicationsByJob(jobId: number): Promise<JobApplication[]>;
    updateStatus(id: number, status: string): Promise<JobApplication>;
}
