import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { NotificationService } from './notification.service';
import { MailService } from './mail.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), FirebaseModule],
  providers: [NotificationService, MailService],
  exports: [NotificationService, MailService],
})
export class NotificationModule {}
