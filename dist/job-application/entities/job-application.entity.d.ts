import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import { ChatMessage } from 'src/chat/entities/chat-message.entity';
export declare class JobApplication {
    id: number;
    job: Job;
    jobId: number;
    applicant: User;
    applicantId: number;
    status: string;
    messages: ChatMessage[];
    createdAt: Date;
    updatedAt: Date;
}
