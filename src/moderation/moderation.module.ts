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
    ]),
  ],
  controllers: [AdminReelReportController],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
