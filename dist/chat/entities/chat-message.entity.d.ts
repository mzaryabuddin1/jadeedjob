import { User } from 'src/users/entities/user.entity';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
export declare class ChatMessage {
    id: number;
    jobApplicationId: number;
    jobApplication: JobApplication;
    senderId: number;
    sender: User;
    content: string;
    mediaUrl: string;
    messageType: string;
    createdAt: Date;
}
