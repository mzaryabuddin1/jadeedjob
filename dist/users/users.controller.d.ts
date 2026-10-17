import { UsersService } from './users.service';
import { Request } from 'express';
import { AuthService } from 'src/auth/auth.service';
import { FirebaseService } from 'src/firebase/firebase.service';
export declare class UsersController {
    private readonly usersService;
    private readonly authService;
    private firebaseService;
    constructor(usersService: UsersService, authService: AuthService, firebaseService: FirebaseService);
    updateMe(req: Request, body: any): Promise<{
        message: string;
        user: import("./entities/user.entity").User;
    }>;
    getMyPreferences(req: any): Promise<{
        data: number[];
    }>;
    getMyUsername(req: any): Promise<{
        username: string;
        canChangeNow: boolean;
        nextChangeAt: Date;
        cooldownDays: number;
    }>;
    changeMyUsername(req: any, body: {
        username: string;
    }): Promise<{
        message: string;
        username: string;
        canChangeNow: boolean;
        nextChangeAt: Date;
        cooldownDays: number;
    }>;
    usernameAvailable(req: any, username: string): Promise<{
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
    getNotificationSettings(req: any): Promise<import("../notification/notification-settings").NotificationSettings>;
    updateNotificationSettings(req: any, body: {
        push?: boolean;
        email?: boolean;
    }): Promise<import("../notification/notification-settings").NotificationSettings>;
}
