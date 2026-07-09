import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
export type FilterIconSource = 'library' | 'svg';
export type FilterIconLibrary = 'Feather' | 'FontAwesome' | 'FontAwesome5';
export declare class Filter {
    id: number;
    name: string;
    icon: string;
    iconSource: FilterIconSource;
    iconLibrary: FilterIconLibrary | null;
    iconName: string | null;
    iconColor: string;
    iconSvg: string | null;
    status: 'active' | 'inactive';
    approvalStatus: 'pending' | 'approved' | 'rejected';
    rejectionReason: string;
    createdBy: number;
    creator: User;
    jobs: Job[];
    createdAt: Date;
    updatedAt: Date;
}
