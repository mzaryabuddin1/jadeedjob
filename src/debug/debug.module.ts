import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { NotificationModule } from 'src/notification/notification.module';
import { JobModule } from 'src/job/job.module';
import { JobApplicationModule } from 'src/job-application/job-application.module';
import { Job } from 'src/job/entities/job.entity';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { NotificationQueueItem } from 'src/notification/notification-queue.entity';
import { FcmLabController, DebugLabGuard } from './fcm-lab.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Job,
      JobApplication,
      NotificationQueueItem,
    ]),
    FirebaseModule,
    NotificationModule,
    JobModule,
    JobApplicationModule,
  ],
  controllers: [FcmLabController],
  providers: [DebugLabGuard],
})
export class DebugModule {}
