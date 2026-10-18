import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Follow } from './follow.entity';
import { FollowService } from './follow.service';
import { FollowController } from './follow.controller';
import { User } from 'src/users/entities/user.entity';
import { Page } from 'src/pages/entities/page.entity';
import { NotificationModule } from 'src/notification/notification.module';
import { FollowNotifier } from './follow-notifier';

@Module({
  imports: [TypeOrmModule.forFeature([Follow, User, Page]), NotificationModule],
  controllers: [FollowController],
  providers: [FollowService, FollowNotifier],
  exports: [FollowService],
})
export class FollowModule {}
