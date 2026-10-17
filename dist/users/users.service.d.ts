import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { FirebaseService } from 'src/firebase/firebase.service';
import { NotificationSettings } from 'src/notification/notification-settings';
export declare class UsersService {
    private readonly userRepo;
    private firebaseService;
    constructor(userRepo: Repository<User>, firebaseService: FirebaseService);
    getUserById(id: number): Promise<User>;
    updateUser(id: number, data: any): Promise<User>;
    findUsersByIds(ids: number[]): Promise<User[]>;
    getUserPreference(userId: number): Promise<{
        data: number[];
    }>;
    getNotificationSettings(userId: number): Promise<NotificationSettings>;
    updateNotificationSettings(userId: number, patch: Partial<NotificationSettings>): Promise<NotificationSettings>;
    private nextUsernameChangeAt;
    getUsernameInfo(userId: number): Promise<{
        username: string;
        canChangeNow: boolean;
        nextChangeAt: Date;
        cooldownDays: number;
    }>;
    checkUsernameAvailable(userId: number, raw: string): Promise<{
        username: string;
        valid: boolean;
        available: boolean;
        reason: string;
    } | {
        username: string;
        valid: boolean;
        available: boolean;
        reason?: undefined;
    }>;
    changeUsername(userId: number, raw: string): Promise<{
        message: string;
        username: string;
        canChangeNow: boolean;
        nextChangeAt: Date;
        cooldownDays: number;
    }>;
    updateUserFilterPreferences(userId: number, newFilters: number[]): Promise<User>;
}
