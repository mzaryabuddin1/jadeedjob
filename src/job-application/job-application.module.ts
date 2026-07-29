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
import { ChatModule } from 'src/chat/chat.module';
import { CompanyPage } from 'src/pages/entities/company-page.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JobApplication,
      Job,
      User,
      Rating,
      PageMember,
      CompanyPage,
    ]),
    NotificationsModule,
    ChatModule,
  ],
  controllers: [JobApplicationController, EmployerJobApplicationController],
  providers: [JobApplicationService],
  exports: [JobApplicationService],
})
export class JobApplicationModule {}
