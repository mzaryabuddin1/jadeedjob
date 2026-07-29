import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { NotificationPreference } from './entities/notification-preference.entity';
import { PushDevice } from './entities/push-device.entity';
import { PushController } from './push.controller';
import { PushService } from './push.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([PushDevice, NotificationPreference]),
    FirebaseModule,
  ],
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
