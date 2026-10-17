import { Repository } from 'typeorm';
import { JobApplication } from './entities/job-application.entity';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import { ApplicationNotifier } from './application-notifier';
import { Page } from 'src/pages/entities/page.entity';
export declare class JobApplicationService {
    private jobAppRepo;
    private jobRepo;
    private userRepo;
    private pageRepo;
    private applicationNotifier;
    constructor(jobAppRepo: Repository<JobApplication>, jobRepo: Repository<Job>, userRepo: Repository<User>, pageRepo: Repository<Page>, applicationNotifier: ApplicationNotifier);
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
    getApplicationsByJob(jobId: number, userId: number): Promise<JobApplication[]>;
    updateStatus(id: number, status: 'accepted' | 'rejected', userId: number): Promise<JobApplication>;
}
