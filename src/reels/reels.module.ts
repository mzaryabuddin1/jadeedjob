import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from 'src/job/entities/job.entity';
import { User } from 'src/users/entities/user.entity';
import { Reel } from './entities/reel.entity';
import { ReelComment } from './entities/reel-comment.entity';
import { ReelCreatorFollow } from './entities/reel-creator-follow.entity';
import { ReelLike } from './entities/reel-like.entity';
import { ReelSave } from './entities/reel-save.entity';
import { ReelUploadSession } from './entities/reel-upload-session.entity';
import { ReelStorageService } from './reel-storage.service';
import { ReelsController } from './reels.controller';
import { ReelsService } from './reels.service';
import { ProfileFollow } from 'src/profiles/entities/profile-follow.entity';
import { ProfilesModule } from 'src/profiles/profiles.module';
import { PagesModule } from 'src/pages/pages.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reel,
      ReelUploadSession,
      ReelLike,
      ReelSave,
      ReelComment,
      ReelCreatorFollow,
      Job,
      User,
      ProfileFollow,
    ]),
    PagesModule,
    ProfilesModule,
    NotificationsModule,
  ],
  controllers: [ReelsController],
  providers: [ReelsService, ReelStorageService],
})
export class ReelsModule {}
