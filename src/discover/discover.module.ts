import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscoverController } from './discover.controller';
import { DiscoverService } from './discover.service';
import { FollowModule } from 'src/follow/follow.module';
import { PostsModule } from 'src/posts/posts.module';
import { User } from 'src/users/entities/user.entity';
import { Page } from 'src/pages/entities/page.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Page]), FollowModule, PostsModule],
  controllers: [DiscoverController],
  providers: [DiscoverService],
  exports: [DiscoverService],
})
export class DiscoverModule {}
