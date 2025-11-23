// src/chat/chat.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
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

  async userCanAccessApplication(userId: number, appId: number): Promise<boolean> {
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
    const { jobApplicationId, content } = dto;

    const app = await this.appRepo.findOne({
      where: { id: jobApplicationId },
      relations: ['job'],
    });

    if (!app) throw new NotFoundException('Job application not found');

    const allowed = await this.userCanAccessApplication(senderId, jobApplicationId);
    if (!allowed) throw new ForbiddenException('You cannot chat on this application');

    const msg = this.messageRepo.create({
      jobApplicationId,
      senderId,
      content,
    });

    await this.messageRepo.save(msg);

    // Return with sender relation
    return this.messageRepo.findOne({
      where: { id: msg.id },
      relations: ['sender'],
    });
  }

  async getMessages(jobApplicationId: number, userId: number, page = 1, limit = 20) {
    const allowed = await this.userCanAccessApplication(userId, jobApplicationId);
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
