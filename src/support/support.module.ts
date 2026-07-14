import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesModule } from 'src/files/files.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { SupportContactMessage } from './entities/support-contact-message.entity';
import { SupportTicketAttachment } from './entities/support-ticket-attachment.entity';
import { SupportTicket } from './entities/support-ticket.entity';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SupportContactMessage,
      SupportTicket,
      SupportTicketAttachment,
    ]),
    FilesModule,
    NotificationsModule,
  ],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
