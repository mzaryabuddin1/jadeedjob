import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Job } from 'src/job/entities/job.entity';
import { FirebaseService } from 'src/firebase/firebase.service';
import { MailService } from './mail.service';
export type NotificationSummary = {
    jobId: number;
    at: string;
    recipientsFound: number;
    groups: {
        filters: string[];
        pushDevices: number;
        emails: number;
    }[];
    push: {
        devices: number;
        success: number;
        failure: number;
        errors: Record<string, {
            count: number;
            hint: string;
        }>;
    };
    email: {
        sent: number;
        skipped: number;
        failed: number;
    };
};
export type RecipientExplanation = {
    userId: number;
    name: string;
    willNotify: boolean;
    reasons: string[];
    matchedFilterIds: number[];
    pushDevices: number;
};
export declare class NotificationService {
    private readonly userRepo;
    private readonly firebaseService;
    private readonly mailService;
    private readonly logger;
    constructor(userRepo: Repository<User>, firebaseService: FirebaseService, mailService: MailService);
    notifyUser(userId: number, message: {
        title: string;
        body: string;
        data?: Record<string, string | number | null | undefined>;
    }): Promise<{
        push: number;
        email: boolean;
    }>;
    private readonly recent;
    getSummary(jobId: number): NotificationSummary | undefined;
    notifyJobCreated(job: Job, opts?: {
        onlyUserIds?: number[];
    }): Promise<NotificationSummary | undefined>;
    explainRecipients(filterIds: number[], creatorId: number, limit?: number): Promise<RecipientExplanation[]>;
    private collectRecipients;
    buildJobPath(jobId: number): string;
    private slimIcon;
    private buildJobMessage;
    private buildJobEmail;
}
