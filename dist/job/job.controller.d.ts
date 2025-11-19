import { JobService } from './job.service';
export declare class JobController {
    private readonly jobService;
    constructor(jobService: JobService);
    createJob(body: any): Promise<import("./entities/job.entity").Job[]>;
    findJobs(query: any): Promise<{
        data: any;
        total: number;
        totalPages: number;
        currentPage: any;
    }>;
    findNearbyJobs(query: any): Promise<{
        data: any;
        total: number;
        totalPages: number;
        currentPage: any;
    }>;
}
