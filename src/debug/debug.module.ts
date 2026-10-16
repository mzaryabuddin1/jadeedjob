import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { NotificationModule } from 'src/notification/notification.module';
import { JobModule } from 'src/job/job.module';
import { FcmLabController, DebugLabGuard } from './fcm-lab.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    FirebaseModule,
    NotificationModule,
    JobModule,
  ],
  controllers: [FcmLabController],
  providers: [DebugLabGuard],
})
export class DebugModule {}
