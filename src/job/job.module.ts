import { Module } from '@nestjs/common';
import { JobController } from './job.controller';
import { JobService } from './job.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './entities/job.entity';
import { Filter } from 'src/filter/entities/filter.entity';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { User } from 'src/users/entities/user.entity';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { CompanyBranch } from 'src/pages/entities/company-branch.entity';
import { PageMember } from 'src/pages/entities/page-member.entity';
import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Job,
      Filter,
      User,
      CompanyPage,
      CompanyBranch,
      PageMember,
      JobApplication,
    ]),
    FirebaseModule,
    NotificationsModule,
  ],
  controllers: [JobController],
  providers: [JobService],
})
export class JobModule {}
