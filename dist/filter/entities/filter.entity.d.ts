import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
export type TablerFilterIcon = {
    type: 'tabler';
    name: string;
};
export type CustomFilterIcon = {
    type: 'custom';
    svg: string;
};
export type FilterIcon = TablerFilterIcon | CustomFilterIcon;
export declare function normalizeFilterIcon(icon: FilterIcon | string | null | undefined): FilterIcon;
export declare class Filter {
    id: number;
    name: string;
    icon: FilterIcon;
    status: 'active' | 'inactive';
    approvalStatus: 'pending' | 'approved' | 'rejected';
    rejectionReason: string;
    createdBy: number | null;
    creator: User;
    taggedJobs: Job[];
    createdAt: Date;
    updatedAt: Date;
}
