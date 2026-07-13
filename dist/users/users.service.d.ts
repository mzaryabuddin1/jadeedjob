import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { FirebaseService } from 'src/firebase/firebase.service';
import { Filter } from 'src/filter/entities/filter.entity';
type ProfileUpdateData = Record<string, any>;
export declare class UsersService {
    private readonly userRepo;
    private readonly filterRepo;
    private firebaseService;
    constructor(userRepo: Repository<User>, filterRepo: Repository<Filter>, firebaseService: FirebaseService);
    private normalizeFilterPreferenceIds;
    private hasInvalidFilterPreferenceIds;
    private findFiltersInPreferenceOrder;
    private toPublicUser;
    private normalizeNullableDates;
    private relationIdFromValue;
    getUserById(id: number): Promise<User>;
    getPublicUserById(id: number): Promise<any>;
    updateUser(id: number, data: any): Promise<User>;
    updateMyProfile(id: number, data: ProfileUpdateData): Promise<any>;
    findUsersByIds(ids: number[]): Promise<User[]>;
    getUserPreference(userId: number): Promise<{
        data: number[];
        filters: {
            iconMeta: import("src/filter/filter-icon.util").FilterIconMeta;
            id: number;
            name: string;
            icon: string;
            iconSource: import("src/filter/entities/filter.entity").FilterIconSource;
            iconLibrary: import("src/filter/entities/filter.entity").FilterIconLibrary | null;
            iconName: string | null;
            iconColor: string;
            iconSvg: string | null;
            status: "active" | "inactive";
            approvalStatus: "pending" | "approved" | "rejected";
            rejectionReason: string;
            createdBy: number;
            creator: User;
            jobs: import("../job/entities/job.entity").Job[];
            createdAt: Date;
            updatedAt: Date;
        }[];
    }>;
    updateUserFilterPreferences(userId: number, newFilters: number[]): Promise<number[]>;
}
export {};
