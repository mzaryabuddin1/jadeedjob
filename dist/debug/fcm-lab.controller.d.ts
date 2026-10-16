import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { FirebaseService } from 'src/firebase/firebase.service';
import { NotificationService } from 'src/notification/notification.service';
import { MailService } from 'src/notification/mail.service';
import { JobService } from 'src/job/job.service';
export declare class DebugLabGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
export declare class FcmLabController {
    private readonly userRepo;
    private readonly firebaseService;
    private readonly notificationService;
    private readonly mailService;
    private readonly jobService;
    constructor(userRepo: Repository<User>, firebaseService: FirebaseService, notificationService: NotificationService, mailService: MailService, jobService: JobService);
    status(): Promise<{
        nodeEnv: string;
        firebaseProjectId: string;
        smtpConfigured: boolean;
        deepLinkTemplate: string;
        usersTotal: number;
        usersWithTokens: number;
    }>;
    users(search?: string, limit?: string): Promise<{
        id: number;
        name: string;
        email: string;
        phone: string;
        isBanned: boolean;
        fcmTokens: string[];
        filterPreferences: number[];
        notificationSettings: import("src/notification/notification-settings").NotificationSettings;
        createdAt: Date;
    }[]>;
    testPush(body: {
        userId?: number;
        token?: string;
    }): Promise<{
        sent: number;
        results: {
            token: string;
            ok: boolean;
            messageId?: string;
            code?: string;
            message?: string;
            hint?: string;
        }[];
    }>;
    explain(body: {
        filterIds: number[];
        creatorId: number;
    }): Promise<import("src/notification/notification.service").RecipientExplanation[]>;
    createJob(body: {
        creatorId: number;
        filterIds: number[];
        title?: string;
        onlyUserIds?: number[];
        notifyAllMatching?: boolean;
        deactivate?: boolean;
    }): Promise<{
        job: {
            id: any;
            title: any;
            filterIds: any;
        };
        deactivated: boolean;
        notification: string | import("src/notification/notification.service").NotificationSummary;
        path: string;
    }>;
}
