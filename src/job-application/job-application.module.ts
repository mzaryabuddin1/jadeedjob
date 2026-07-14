import { Module } from '@nestjs/common';
import { JobApplicationController } from './job-application.controller';
import { EmployerJobApplicationController } from './employer-job-application.controller';
import { JobApplicationService } from './job-application.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobApplication } from './entities/job-application.entity';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import { Rating } from 'src/rating/entities/rating.entity';
import { PageMember } from 'src/pages/entities/page-member.entity';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobApplication, Job, User, Rating, PageMember]),
    NotificationsModule,
  ],
  controllers: [JobApplicationController, EmployerJobApplicationController],
  providers: [JobApplicationService],
})
export class JobApplicationModule {}
