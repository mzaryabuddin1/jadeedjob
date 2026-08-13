import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyPage } from 'src/pages/entities/company-page.entity';
import { ProfileBlock } from 'src/profiles/entities/profile-block.entity';
import { ProfileFollow } from 'src/profiles/entities/profile-follow.entity';
import { ReelCreatorFollow } from 'src/reels/entities/reel-creator-follow.entity';
import { ReelReport } from 'src/reels/entities/reel-report.entity';
import { Reel } from 'src/reels/entities/reel.entity';
import { User } from 'src/users/entities/user.entity';
import { AdminReelReportController } from './admin-reel-report.controller';
import { ModerationService } from './moderation.service';
import { CommunityPost } from 'src/posts/entities/community-post.entity';
import { PostComment } from 'src/posts/entities/post-comment.entity';
import { ReelComment } from 'src/reels/entities/reel-comment.entity';
import { ChatMessage } from 'src/chat/entities/chat-message.entity';
import { Job } from 'src/job/entities/job.entity';
import { PageMember } from 'src/pages/entities/page-member.entity';
import { ModerationReport } from './entities/moderation-report.entity';
import { ModerationAudit } from './entities/moderation-audit.entity';
import { AdminModerationController } from './admin-moderation.controller';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProfileBlock,
      ProfileFollow,
      ReelCreatorFollow,
      User,
      CompanyPage,
      Reel,
      ReelReport,
      ReelComment,
      CommunityPost,
      PostComment,
      ChatMessage,
      Job,
      PageMember,
      ModerationReport,
      ModerationAudit,
    ]),
    NotificationsModule,
  ],
  controllers: [AdminReelReportController, AdminModerationController],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
