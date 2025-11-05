import { JobApplicationService } from './job-application.service';
export declare class JobApplicationController {
    private readonly jobAppService;
    constructor(jobAppService: JobApplicationService);
    apply(body: any, req: any): Promise<import("mongoose").Document<unknown, {}, import("./job-application.schema").JobApplication, {}> & import("./job-application.schema").JobApplication & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    getMyApplications(req: any, page?: number, limit?: number): Promise<{
        data: (import("mongoose").Document<unknown, {}, import("./job-application.schema").JobApplication, {}> & import("./job-application.schema").JobApplication & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getByJob(jobId: string): Promise<(import("mongoose").Document<unknown, {}, import("./job-application.schema").JobApplication, {}> & import("./job-application.schema").JobApplication & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    updateStatus(id: string, status: string): Promise<import("mongoose").Document<unknown, {}, import("./job-application.schema").JobApplication, {}> & import("./job-application.schema").JobApplication & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
}
