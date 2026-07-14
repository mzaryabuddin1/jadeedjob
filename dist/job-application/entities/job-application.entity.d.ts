import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import { ChatMessage } from 'src/chat/entities/chat-message.entity';
import { Rating } from 'src/rating/entities/rating.entity';
export declare class JobApplication {
    id: number;
    job: Job;
    jobId: number;
    applicant: User;
    applicantId: number;
    status: string;
    withdrawnAt: Date;
    completedAt: Date;
    messages: ChatMessage[];
    ratings: Rating[];
    createdAt: Date;
    updatedAt: Date;
}
