import { JobService } from './job.service';
export declare class JobController {
    private readonly jobService;
    constructor(jobService: JobService);
    createJob(body: any, req: any): Promise<import("./entities/job.entity").Job[]>;
    findJobs(query: any, req: any): Promise<{
        data: any;
        total: number;
        totalPages: number;
        currentPage: any;
    }>;
    findJob(id: number): Promise<import("./entities/job.entity").Job>;
}
