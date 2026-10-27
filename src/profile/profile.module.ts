import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { FollowModule } from 'src/follow/follow.module';
import { User } from 'src/users/entities/user.entity';
import { WorkExperience } from 'src/users/entities/work-experience.entity';
import { Education } from 'src/users/entities/education.entity';
import { Certification } from 'src/users/entities/certification.entity';
import { UserLanguage } from 'src/users/entities/user-language.entity';
import { Page } from 'src/pages/entities/page.entity';
import { PageMember } from 'src/pages/entities/page-member.entity';
import { Post } from 'src/posts/entities/post.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      WorkExperience,
      Education,
      Certification,
      UserLanguage,
      Page,
      PageMember,
      Post,
    ]),
    FollowModule,
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
