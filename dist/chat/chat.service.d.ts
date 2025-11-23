import { Repository } from 'typeorm';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatMessage } from './entities/chat-message.entity';
export declare class ChatService {
    private readonly messageRepo;
    private readonly appRepo;
    private readonly jobRepo;
    private readonly userRepo;
    constructor(messageRepo: Repository<ChatMessage>, appRepo: Repository<JobApplication>, jobRepo: Repository<Job>, userRepo: Repository<User>);
    userCanAccessApplication(userId: number, appId: number): Promise<boolean>;
    sendMessage(senderId: number, dto: SendMessageDto): Promise<ChatMessage>;
    getMessages(jobApplicationId: number, userId: number, page?: number, limit?: number): Promise<{
        data: ChatMessage[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
}
