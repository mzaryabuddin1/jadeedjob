import { Module } from '@nestjs/common';
import { JobApplicationController } from './job-application.controller';
import { JobApplicationService } from './job-application.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JobModule } from 'src/job/job.module';

@Module({
  imports: [PrismaModule, JobModule],
  controllers: [JobApplicationController],
  providers: [JobApplicationService],
})
export class JobApplicationModule {}
