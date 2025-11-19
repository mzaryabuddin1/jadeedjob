import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
export declare class Filter {
    id: number;
    name: string;
    icon: string;
    status: 'active' | 'inactive';
    approvalStatus: 'pending' | 'approved' | 'rejected';
    rejectionReason: string;
    createdBy: number;
    creator: User;
    jobs: Job[];
    createdAt: Date;
    updatedAt: Date;
}
