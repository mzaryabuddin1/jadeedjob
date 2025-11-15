import { JobService } from './job.service';
export declare class JobController {
    private readonly jobService;
    constructor(jobService: JobService);
    createJob(body: any, req: any): Promise<any>;
    findJobs(query: any): Promise<{
        data: any;
        total: any;
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
