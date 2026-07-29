import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { Job } from 'src/job/entities/job.entity';
import { ChatParticipant } from './chat-participant.entity';
export declare class ChatConversation {
    id: string;
    type: 'application' | 'inquiry' | 'invitation';
    jobId: number;
    job: Job;
    applicationId: number;
    application: JobApplication;
    createdByUserId: number;
    companyId: number;
    writeState: 'active' | 'read_only';
    readOnlyReason: string;
    clientRequestId: string;
    lastActivityAt: Date;
    participants: ChatParticipant[];
    createdAt: Date;
    updatedAt: Date;
}
