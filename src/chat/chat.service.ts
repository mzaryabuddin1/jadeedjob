// src/chat/chat.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatMessage } from './entities/chat-message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,

    @InjectRepository(JobApplication)
    private readonly appRepo: Repository<JobApplication>,

    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async userCanAccessApplication(
    userId: number,
    appId: number,
  ): Promise<boolean> {
    const app = await this.appRepo.findOne({
      where: { id: appId },
      relations: ['job', 'job.creator'],
    });

    if (!app) return false;

    const isApplicant = app.applicantId === userId;
    const isOwner = app.job.creator.id === userId;

    return isApplicant || isOwner;
  }

  async sendMessage(senderId: number, dto: SendMessageDto) {
    const { jobApplicationId, content, mediaUrl, messageType } = dto;

    // 1. Validate application exists
    const app = await this.appRepo.findOne({
      where: { id: jobApplicationId },
      relations: ['job', 'job.creator'],
    });

    if (!app) throw new NotFoundException('Job application not found');

    // 2. Check if user can chat here
    const allowed = await this.userCanAccessApplication(
      senderId,
      jobApplicationId,
    );
    if (!allowed)
      throw new ForbiddenException('You cannot chat on this application');

    // 3. Safety validation (DTO already handles most cases)
    if (messageType === 'text' && !content) {
      throw new BadRequestException('Text messages must include content');
    }

    if (messageType !== 'text' && !mediaUrl) {
      throw new BadRequestException('Media messages must include mediaUrl');
    }

    // 4. Create message
    const msg = this.messageRepo.create({
      jobApplicationId,
      senderId,
      content: content || null,
      mediaUrl: mediaUrl || null,
      messageType,
    });

    await this.messageRepo.save(msg);

    // 5. Return with sender information
    return this.messageRepo.findOne({
      where: { id: msg.id },
      relations: ['sender'],
    });
  }

  async getMessages(
    jobApplicationId: number,
    userId: number,
    page = 1,
    limit = 20,
  ) {
    const allowed = await this.userCanAccessApplication(
      userId,
      jobApplicationId,
    );
    if (!allowed) throw new ForbiddenException('You cannot view this chat');

    const [data, total] = await this.messageRepo.findAndCount({
      where: { jobApplicationId },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  }
}
