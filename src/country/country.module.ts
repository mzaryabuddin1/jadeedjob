import { MongooseModule } from '@nestjs/mongoose';
import { Country, CountrySchema } from './country.schema';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Country.name, schema: CountrySchema }]),
  ],
})
export class CountryModule {}
