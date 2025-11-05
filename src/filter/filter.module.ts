import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Filter, FilterSchema } from './filter.schema';
import { FilterService } from './filter.service';
import { FilterController } from './filter.controller';
import { Job, JobSchema } from 'src/job/job.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Filter.name, schema: FilterSchema },
      { name: Job.name, schema: JobSchema }, // ✅ Add Job
    ]),
  ],
  controllers: [FilterController],
  providers: [FilterService],
})
export class FilterModule {}
