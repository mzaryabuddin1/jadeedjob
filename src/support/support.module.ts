import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { User } from 'src/users/entities/user.entity';
import { SupportContactMessage } from './entities/support-contact-message.entity';
import { SupportTicketAttachment } from './entities/support-ticket-attachment.entity';
import { SupportTicket } from './entities/support-ticket.entity';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { SupportTicketMessage } from './entities/support-ticket-message.entity';
import { AdminSupportController } from './admin-support.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SupportContactMessage,
      SupportTicket,
      SupportTicketAttachment,
      SupportTicketMessage,
      User,
    ]),
    NotificationsModule,
  ],
  controllers: [SupportController, AdminSupportController],
  providers: [SupportService],
})
export class SupportModule {}
