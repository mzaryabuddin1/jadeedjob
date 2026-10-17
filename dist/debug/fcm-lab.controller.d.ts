import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Job } from 'src/job/entities/job.entity';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { JobApplicationService } from 'src/job-application/job-application.service';
import { ApplicationNotifier } from 'src/job-application/application-notifier';
import { NotificationQueueItem } from 'src/notification/notification-queue.entity';
import { FirebaseService } from 'src/firebase/firebase.service';
import { NotificationService } from 'src/notification/notification.service';
import { MailService } from 'src/notification/mail.service';
import { JobService } from 'src/job/job.service';
export declare class DebugLabGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
export declare class FcmLabController {
    private readonly userRepo;
    private readonly jobRepo;
    private readonly appRepo;
    private readonly queueRepo;
    private readonly jobApplicationService;
    private readonly applicationNotifier;
    private readonly firebaseService;
    private readonly notificationService;
    private readonly mailService;
    private readonly jobService;
    constructor(userRepo: Repository<User>, jobRepo: Repository<Job>, appRepo: Repository<JobApplication>, queueRepo: Repository<NotificationQueueItem>, jobApplicationService: JobApplicationService, applicationNotifier: ApplicationNotifier, firebaseService: FirebaseService, notificationService: NotificationService, mailService: MailService, jobService: JobService);
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
    jobs(limit?: string): Promise<{
        timing: {
            delaySeconds: number;
            minGapSeconds: number;
        };
        jobs: {
            id: number;
            title: string;
            isActive: boolean;
            isTest: boolean;
            filters: string[];
            applications: number;
            createdAt: Date;
            employer: {
                id: number;
                name: string;
                pushDevices: number;
                pushEnabled: boolean;
                emailEnabled: boolean;
                willBeNotified: boolean;
                whyNot: string;
            };
        }[];
    }>;
    apply(body: {
        jobId: number;
        applicantIds: number[];
        confirmReal?: boolean;
    }): Promise<{
        applied: number;
        results: any[];
        timing: {
            delaySeconds: number;
            minGapSeconds: number;
        };
        note: string;
    }>;
    queue(jobId: string): Promise<{
        now: Date;
        timing: {
            delaySeconds: number;
            minGapSeconds: number;
        };
        pendingCount: number;
        estimatedSendAt: Date;
        rows: {
            id: number;
            status: import("src/notification/notification-queue.entity").QueueItemStatus;
            applicant: any;
            queuedAt: Date;
            processedAt: Date;
            attempts: number;
            note: string;
        }[];
    }>;
    resetJob(body: {
        jobId: number;
    }): Promise<{
        jobId: number;
        applicationsDeleted: number;
        queueRowsDeleted: number;
    }>;
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
