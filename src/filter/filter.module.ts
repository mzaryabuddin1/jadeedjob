import { Module } from '@nestjs/common';
import { FilterService } from './filter.service';
import { FilterController } from './filter.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Filter } from './entities/filter.entity';
import { User } from 'src/users/entities/user.entity';
import { Job } from 'src/job/entities/job.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Filter, User, Job])],
  controllers: [FilterController],
  providers: [FilterService],
  exports: [FilterService],
})
export class FilterModule {}
