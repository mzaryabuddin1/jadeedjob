// src/rating/rating.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Rating } from './entities/rating.entity';
import { RatingService } from './rating.service';
import { RatingController } from './rating.controller';

import { JobApplication } from 'src/job-application/entities/job-application.entity';
import { User } from 'src/users/entities/user.entity';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { PageMember } from 'src/pages/entities/page-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Rating,
      JobApplication,
      User,
      CompanyPage,
      PageMember,
    ]),
  ],
  controllers: [RatingController],
  providers: [RatingService],
  exports: [RatingService],
})
export class RatingModule {}
