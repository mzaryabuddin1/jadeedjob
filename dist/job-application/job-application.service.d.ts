import { Model } from 'mongoose';
import { JobApplication } from './job-application.schema';
import { Job } from 'src/job/job.schema';
export declare class JobApplicationService {
    private jobAppModel;
    private jobModel;
    constructor(jobAppModel: Model<JobApplication>, jobModel: Model<Job>);
    apply(data: any): Promise<import("mongoose").Document<unknown, {}, JobApplication, {}> & JobApplication & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    getApplicationsByUser(userId: string, page?: number, limit?: number): Promise<{
        data: (import("mongoose").Document<unknown, {}, JobApplication, {}> & JobApplication & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    getApplicationsByJob(jobId: string): Promise<(import("mongoose").Document<unknown, {}, JobApplication, {}> & JobApplication & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    updateStatus(id: string, status: string): Promise<import("mongoose").Document<unknown, {}, JobApplication, {}> & JobApplication & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
}
