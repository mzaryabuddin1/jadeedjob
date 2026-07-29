import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import { ChatConversation } from './chat-conversation.entity';
export declare class JobInvitation {
    id: string;
    conversationId: string;
    conversation: ChatConversation;
    jobId: number;
    job: Job;
    inviterUserId: number;
    inviter: User;
    inviteeUserId: number;
    invitee: User;
    status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
    respondedAt: Date;
    expiresAt: Date;
    clientRequestId: string;
    createdAt: Date;
    updatedAt: Date;
}
