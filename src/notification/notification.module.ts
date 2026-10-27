import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { NotificationService } from './notification.service';
import { MailService } from './mail.service';
import { NotificationQueueItem } from './notification-queue.entity';
import { NotificationQueueService } from './notification-queue.service';
import { Notification } from './notification.entity';
import { NotificationInbox } from './notification-inbox.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, NotificationQueueItem, Notification]),
    FirebaseModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationService,
    MailService,
    NotificationQueueService,
    NotificationInbox,
  ],
  exports: [
    NotificationService,
    MailService,
    NotificationQueueService,
    NotificationInbox,
  ],
})
export class NotificationModule {}
