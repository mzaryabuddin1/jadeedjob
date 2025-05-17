import { MongooseModule } from '@nestjs/mongoose';
import { Language, LanguageSchema } from './language.schema';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Language.name, schema: LanguageSchema }]),
  ],
})
export class LanguageModule {}
