import { Module } from '@nestjs/common';
import { JobController } from './job.controller';
import { JobService } from './job.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './entities/job.entity';
import { Filter } from 'src/filter/entities/filter.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Job, Filter])],
  controllers: [JobController],
  providers: [JobService],
})
export class JobModule {}
