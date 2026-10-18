import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';
import {
  PostComment,
  PostHashtag,
  PostLike,
  PostShare,
  PostStatsDaily,
  PostViewer,
} from './entities/post-engagement.entities';
import { PostsService } from './posts.service';
import { PostEngagementService } from './post-engagement.service';
import { PostEngagementNotifier } from './post-engagement-notifier';
import { PostAnalyticsService } from './post-analytics.service';
import { PostStatsService } from './post-stats.service';
import { PostsController } from './posts.controller';
import { PostEngagementController } from './post-engagement.controller';
import { PostAnalyticsController } from './post-analytics.controller';
import { MediaModule } from 'src/media/media.module';
import { PagesModule } from 'src/pages/pages.module';
import { FollowModule } from 'src/follow/follow.module';
import { NotificationModule } from 'src/notification/notification.module';
import { User } from 'src/users/entities/user.entity';
import { Page } from 'src/pages/entities/page.entity';
import { PageMember } from 'src/pages/entities/page-member.entity';
import { Job } from 'src/job/entities/job.entity';
import { Follow } from 'src/follow/follow.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Post,
      PostLike,
      PostComment,
      PostShare,
      PostViewer,
      PostStatsDaily,
      PostHashtag,
      User,
      Page,
      PageMember,
      Job,
      Follow,
    ]),
    MediaModule,
    PagesModule,
    FollowModule,
    NotificationModule,
  ],
  controllers: [
    PostsController,
    PostEngagementController,
    PostAnalyticsController,
  ],
  providers: [
    PostsService,
    PostEngagementService,
    PostEngagementNotifier,
    PostAnalyticsService,
    PostStatsService,
  ],
  exports: [PostsService],
})
export class PostsModule {}
