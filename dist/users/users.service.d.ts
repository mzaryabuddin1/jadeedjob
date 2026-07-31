import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { FirebaseService } from 'src/firebase/firebase.service';
import { Filter } from 'src/filter/entities/filter.entity';
import { ObjectStorageService } from 'src/storage/object-storage.service';
import { AuthSessionService } from 'src/auth/auth-session.service';
import { PushService } from 'src/push/push.service';
type ProfileUpdateData = Record<string, any>;
export declare class UsersService {
    private readonly userRepo;
    private readonly filterRepo;
    private firebaseService;
    private readonly storageService;
    private readonly authSessionService;
    private readonly pushService;
    constructor(userRepo: Repository<User>, filterRepo: Repository<Filter>, firebaseService: FirebaseService, storageService: ObjectStorageService, authSessionService: AuthSessionService, pushService: PushService);
    private normalizeFilterPreferenceIds;
    private hasInvalidFilterPreferenceIds;
    private findFiltersInPreferenceOrder;
    private toPublicUser;
    private generateUniqueReferralCode;
    private normalizeProfileSystemFields;
    private buildProfileResponse;
    private normalizeNullableDates;
    private relationIdFromValue;
    getUserById(id: number): Promise<User>;
    getPublicUserById(id: number): Promise<any>;
    getMyProfileResponse(id: number): Promise<{
        user: any;
        verificationRequirements: import("./profile-verification.util").VerificationRequirements;
    }>;
    updateUser(id: number, data: any): Promise<User>;
    setUserBan(userId: number, adminId: number, banned: boolean, reason?: string): Promise<{
        message: string;
        user: {
            id: number;
            isBanned: boolean;
        };
    }>;
    updateMyProfile(id: number, data: ProfileUpdateData): Promise<any>;
    uploadProfileDocument(userId: number, type: 'id_front' | 'id_back' | 'address_proof' | 'profile_photo', file: Express.Multer.File): Promise<{
        fileUrl: string;
        profile: {
            user: any;
            verificationRequirements: import("./profile-verification.util").VerificationRequirements;
        };
    }>;
    uploadCredentialDocument(userId: number, type: 'experience' | 'education' | 'certification', recordId: number, file: Express.Multer.File): Promise<{
        user: any;
        verificationRequirements: import("./profile-verification.util").VerificationRequirements;
    }>;
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
