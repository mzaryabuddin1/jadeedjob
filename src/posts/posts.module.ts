import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from 'src/job/entities/job.entity';
import { PagesModule } from 'src/pages/pages.module';
import { ProfileFollow } from 'src/profiles/entities/profile-follow.entity';
import { User } from 'src/users/entities/user.entity';
import { CommunityPost } from './entities/community-post.entity';
import { PostComment } from './entities/post-comment.entity';
import { PostLike } from './entities/post-like.entity';
import { PostReport } from './entities/post-report.entity';
import { PostSave } from './entities/post-save.entity';
import { PostVideoUploadSession } from './entities/post-video-upload-session.entity';
import { PostStorageService } from './post-storage.service';
import { PostVideoStorageService } from './post-video-storage.service';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommunityPost,
      PostLike,
      PostSave,
      PostComment,
      PostReport,
      PostVideoUploadSession,
      ProfileFollow,
      Job,
      User,
    ]),
    PagesModule,
  ],
  controllers: [PostsController],
  providers: [PostsService, PostStorageService, PostVideoStorageService],
  exports: [PostsService],
})
export class PostsModule {}
