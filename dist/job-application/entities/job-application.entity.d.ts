import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
export declare class JobApplication {
    id: number;
    job: Job;
    jobId: number;
    applicant: User;
    applicantId: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}
