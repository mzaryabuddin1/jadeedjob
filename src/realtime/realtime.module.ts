import { Global, Module } from '@nestjs/common';
import { RealtimePresenceService } from './realtime-presence.service';

@Global()
@Module({
  providers: [RealtimePresenceService],
  exports: [RealtimePresenceService],
})
export class RealtimeModule {}
