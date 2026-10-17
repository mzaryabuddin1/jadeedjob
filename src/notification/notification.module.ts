import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { NotificationService } from './notification.service';
import { MailService } from './mail.service';
import { NotificationQueueItem } from './notification-queue.entity';
import { NotificationQueueService } from './notification-queue.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, NotificationQueueItem]),
    FirebaseModule,
  ],
  providers: [NotificationService, MailService, NotificationQueueService],
  exports: [NotificationService, MailService, NotificationQueueService],
})
export class NotificationModule {}
