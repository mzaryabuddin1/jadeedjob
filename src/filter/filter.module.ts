import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Filter, FilterSchema } from './filter.schema';
import { FilterService } from './filter.service';
import { FilterController } from './filter.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Filter.name, schema: FilterSchema }])],
  controllers: [FilterController],
  providers: [FilterService],
})
export class FilterModule {}
