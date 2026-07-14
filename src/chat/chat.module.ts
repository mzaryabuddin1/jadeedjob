// src/chat/chat.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatsController } from './chats.controller';
import { PageMember } from 'src/pages/entities/page-member.entity';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { FilesModule } from 'src/files/files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage, JobApplication, Job, User, PageMember]),
    NotificationsModule,
    FilesModule,
  ],
  providers: [ChatService, ChatGateway],
  controllers: [ChatController, ChatsController],
})
export class ChatModule {}
