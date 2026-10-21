// src/chat/chat.service.ts
//
// Legacy "chat per job application" API (socket `joinApplication` / `sendMessage`
// and `GET /chat/application/:id/messages`). It keeps its old request/response
// shape but now reads and writes the same conversations as the new inbox: the
// chat of an application is the job chat of (its job, its applicant), so both
// APIs always show the same messages.
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { Page } from 'src/pages/entities/page.entity';
import { isJobTeam } from './job-team.util';
import { SendMessageDto } from './dto/send-message.dto';
import { Conversation } from './entities/conversation.entity';
import { ConversationMessage } from './entities/conversation-message.entity';
import { ConversationsService } from './conversations.service';
import { MessagesService } from './messages.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(JobApplication)
    private readonly appRepo: Repository<JobApplication>,
    @InjectRepository(Page) private readonly pageRepo: Repository<Page>,
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(ConversationMessage)
    private readonly msgRepo: Repository<ConversationMessage>,
    private readonly conversations: ConversationsService,
    private readonly messages: MessagesService,
  ) {}

  /** the applicant, or the employer side of the job (poster / current page team) */
  async userCanAccessApplication(
    userId: number,
    appId: number,
  ): Promise<boolean> {
    const app = await this.appRepo.findOne({
      where: { id: appId },
      relations: ['job'],
    });
    if (!app) return false;
    if (app.applicantId === userId) return true;
    return isJobTeam(this.pageRepo, app.job, userId);
  }

  /** the job chat that belongs to this application */
  private async conversationOf(userId: number, applicationId: number) {
    const app = await this.appRepo.findOne({ where: { id: applicationId } });
    if (!app) throw new NotFoundException('Job application not found');
    return this.conversations.getOrCreate(
      userId,
      userId === app.applicantId
        ? { type: 'job', jobId: app.jobId }
        : { type: 'job', jobId: app.jobId, userId: app.applicantId },
      { allowInactive: true },
    );
  }

  async sendMessage(senderId: number, dto: SendMessageDto) {
    const conv = await this.conversationOf(senderId, dto.jobApplicationId);
    const msg = await this.messages.send(senderId, conv.id, {
      content: dto.content,
      mediaUrl: dto.mediaUrl,
      messageType: dto.messageType,
    });
    return this.legacy(msg, dto.jobApplicationId);
  }

  async getMessages(
    jobApplicationId: number,
    userId: number,
    page = 1,
    limit = 20,
  ) {
    const app = await this.appRepo.findOne({ where: { id: jobApplicationId } });
    if (!app) throw new NotFoundException('Job application not found');
    if (!(await this.userCanAccessApplication(userId, jobApplicationId))) {
      throw new ForbiddenException('You cannot view this chat');
    }

    const conv = await this.convRepo.findOne({
      where: { key: `j:${app.jobId}:${app.applicantId}` },
    });
    if (!conv) {
      return { data: [], total: 0, totalPages: 0, currentPage: page };
    }

    const [rows, total] = await this.msgRepo.findAndCount({
      where: { conversationId: conv.id },
      order: { id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const views = await this.messages.views(rows);
    return {
      data: views.map((v) => this.legacy(v, jobApplicationId)),
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };
  }

  /** the old message shape (`sender` with firstName / lastName) */
  private legacy(
    v: Awaited<ReturnType<MessagesService['views']>>[number],
    jobApplicationId: number,
  ) {
    const [firstName, ...rest] = (v.sender?.name ?? '').split(' ');
    return {
      id: v.id,
      jobApplicationId,
      senderId: v.senderId,
      content: v.content,
      mediaUrl: v.mediaUrl,
      messageType: v.messageType,
      createdAt: v.createdAt,
      sender: v.sender
        ? {
            id: v.sender.id,
            firstName,
            lastName: rest.join(' '),
            username: v.sender.username,
            profile_photo: v.sender.profile_photo,
          }
        : null,
    };
  }
}
