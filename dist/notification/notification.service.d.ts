import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Job } from 'src/job/entities/job.entity';
import { FirebaseService } from 'src/firebase/firebase.service';
import { MailService } from './mail.service';
export declare class NotificationService {
    private readonly userRepo;
    private readonly firebaseService;
    private readonly mailService;
    private readonly logger;
    constructor(userRepo: Repository<User>, firebaseService: FirebaseService, mailService: MailService);
    notifyJobCreated(job: Job): Promise<void>;
    private collectRecipients;
    buildJobPath(jobId: number): string;
    private slimIcon;
    private buildJobMessage;
    private buildJobEmail;
}
