import { JobService } from './job.service';
import { UsersService } from 'src/users/users.service';
export declare class JobController {
    private readonly jobService;
    private readonly userService;
    constructor(jobService: JobService, userService: UsersService);
    createJob(body: any, req: any): Promise<import("./job.schema").Job>;
    findJobs(query: any): Promise<{
        data: any[];
        total: any;
        totalPages: number;
        currentPage: any;
    }>;
    findNearbyJobs(query: any): Promise<{
        data: (import("mongoose").Document<unknown, {}, import("./job.schema").Job, {}> & import("./job.schema").Job & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        total: number;
        totalPages: number;
        currentPage: any;
    }>;
}
