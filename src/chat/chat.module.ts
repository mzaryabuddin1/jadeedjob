// src/chat/chat.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { Job } from 'src/job/entities/job.entity';
import { Page } from 'src/pages/entities/page.entity';
import { User } from 'src/users/entities/user.entity';
import { NotificationModule } from 'src/notification/notification.module';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { MessagesService } from './messages.service';
import { RealtimeModule } from './realtime.module';
import { ChatNotifier } from './chat-notifier';
import { ChatMigration } from './chat-migration.service';
import { ChatMessage } from './entities/chat-message.entity';
import { Conversation } from './entities/conversation.entity';
import { ConversationMember } from './entities/conversation-member.entity';
import { ConversationMessage } from './entities/conversation-message.entity';
import { UserBlock } from './entities/user-block.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatMessage, // legacy table (read once by ChatMigration)
      Conversation,
      ConversationMember,
      ConversationMessage,
      UserBlock,
      JobApplication,
      Job,
      Page,
      User,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
    NotificationModule,
    RealtimeModule,
  ],
  providers: [
    ChatService,
    ChatGateway,
    ConversationsService,
    MessagesService,
    ChatNotifier,
    ChatMigration,
  ],
  controllers: [ChatController, ConversationsController],
})
export class ChatModule {}
