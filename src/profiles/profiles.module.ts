import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { ReelCreatorFollow } from 'src/reels/entities/reel-creator-follow.entity';
import { ProfileFollow } from './entities/profile-follow.entity';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { PagesModule } from 'src/pages/pages.module';
import { ProfilePublisherOptionsController } from './profile-publisher-options.controller';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    PagesModule,
    NotificationsModule,
    TypeOrmModule.forFeature([
      ProfileFollow,
      ReelCreatorFollow,
      User,
      CompanyPage,
    ]),
  ],
  controllers: [ProfilePublisherOptionsController, ProfilesController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
