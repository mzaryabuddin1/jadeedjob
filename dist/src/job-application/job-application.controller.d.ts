import { JobApplicationService } from './job-application.service';
export declare class JobApplicationController {
    private readonly jobAppService;
    constructor(jobAppService: JobApplicationService);
    apply(body: any, req: any): Promise<any>;
    getMyApplications(req: any, page?: number, limit?: number): Promise<{
        data: any;
        total: any;
        totalPages: number;
        currentPage: number;
    }>;
    getByJob(jobId: number): Promise<any>;
    updateStatus(id: number, status: string): Promise<any>;
}
