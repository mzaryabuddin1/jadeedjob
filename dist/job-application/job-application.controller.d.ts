import { JobApplicationService } from './job-application.service';
export declare class JobApplicationController {
    private readonly jobAppService;
    constructor(jobAppService: JobApplicationService);
    apply(body: any, req: any): Promise<import("./entities/job-application.entity").JobApplication>;
    getMyApplications(req: any, page?: number, limit?: number): Promise<{
        data: import("./entities/job-application.entity").JobApplication[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getByJob(jobId: number): Promise<import("./entities/job-application.entity").JobApplication[]>;
    updateStatus(id: number, status: string): Promise<import("./entities/job-application.entity").JobApplication>;
}
