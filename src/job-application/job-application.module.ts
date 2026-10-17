import { Module } from '@nestjs/common';
import { JobApplicationController } from './job-application.controller';
import { JobApplicationService } from './job-application.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobApplication } from './entities/job-application.entity';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import { Page } from 'src/pages/entities/page.entity';
import { NotificationModule } from 'src/notification/notification.module';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { ApplicationNotifier } from './application-notifier';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobApplication, Job, User, Page]),
    NotificationModule,
    FirebaseModule,
  ],
  controllers: [JobApplicationController],
  providers: [JobApplicationService, ApplicationNotifier],
  exports: [JobApplicationService, ApplicationNotifier],
})
export class JobApplicationModule {}
