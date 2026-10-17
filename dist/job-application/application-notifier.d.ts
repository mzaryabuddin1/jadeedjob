import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import { JobApplication } from './entities/job-application.entity';
import { FirebaseService } from 'src/firebase/firebase.service';
import { MailService } from 'src/notification/mail.service';
import { NotificationQueueService } from 'src/notification/notification-queue.service';
export declare class ApplicationNotifier implements OnModuleInit {
    private readonly queue;
    private readonly firebaseService;
    private readonly mailService;
    private readonly userRepo;
    private readonly jobRepo;
    private readonly appRepo;
    private readonly logger;
    constructor(queue: NotificationQueueService, firebaseService: FirebaseService, mailService: MailService, userRepo: Repository<User>, jobRepo: Repository<Job>, appRepo: Repository<JobApplication>);
    getTiming(): {
        delaySeconds: number;
        minGapSeconds: number;
    };
    onModuleInit(): void;
    onApplied(job: Job, application: JobApplication): Promise<void>;
    buildPath(jobId: number): string;
    private flush;
}
