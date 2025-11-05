import { Job } from './job.schema';
import { Model } from 'mongoose';
export declare class JobService {
    private readonly jobModel;
    constructor(jobModel: Model<Job>);
    createJob(payload: any): Promise<Job>;
    findNearbyJobs(payload: any): Promise<{
        data: (import("mongoose").Document<unknown, {}, Job, {}> & Job & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        total: number;
        totalPages: number;
        currentPage: any;
    }>;
    findJobs(query: any): Promise<{
        data: any[];
        total: any;
        totalPages: number;
        currentPage: any;
    }>;
}
