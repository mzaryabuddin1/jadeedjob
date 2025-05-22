import { Module } from '@nestjs/common';
import { JobController } from './job.controller';
import { JobService } from './job.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Job, JobSchema } from './job.schema';
import { UsersModule } from 'src/users/users.module';

@Module({
imports: [
    MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }]),
    UsersModule
  ],
  controllers: [JobController],
  providers: [JobService]
})
export class JobModule {}
