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
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { ChatConversation } from './entities/chat-conversation.entity';
import { ChatParticipant } from './entities/chat-participant.entity';
import { ChatReadState } from './entities/chat-read-state.entity';
import { JobInvitation } from './entities/job-invitation.entity';
import { ProfileChatOptionsController } from './profile-chat-options.controller';
import { JobInvitationController } from './job-invitation.controller';
import { ChatOutboxProcessor } from './chat-outbox.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatMessage,
      ChatConversation,
      ChatParticipant,
      ChatReadState,
      JobInvitation,
      JobApplication,
      Job,
      User,
      PageMember,
      CompanyPage,
    ]),
    NotificationsModule,
  ],
  providers: [ChatService, ChatGateway, ChatOutboxProcessor],
  controllers: [
    ChatController,
    ChatsController,
    ProfileChatOptionsController,
    JobInvitationController,
  ],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
