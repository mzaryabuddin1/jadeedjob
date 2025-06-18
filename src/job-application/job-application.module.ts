import { Module } from '@nestjs/common';
import { JobApplicationController } from './job-application.controller';
import { JobApplicationService } from './job-application.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from 'src/users/users.module';
import { JobApplication, JobApplicationSchema } from './job-application.schema';
import { JobModule } from 'src/job/job.module';
import { Job, JobSchema } from 'src/job/job.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JobApplication.name, schema: JobApplicationSchema },
      { name: Job.name, schema: JobSchema },
    ]),
    JobModule
  ],
  controllers: [JobApplicationController],
  providers: [JobApplicationService]
})
export class JobApplicationModule {}
