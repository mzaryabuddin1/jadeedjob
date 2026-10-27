import { Global, Module } from '@nestjs/common';
import { ChatEvents } from './chat-events.service';

/**
 * Shared bridge to the socket server (personal rooms `user:{id}`), available to
 * every module: chat uses it for messages, notifications for `notification:new`.
 */
@Global()
@Module({
  providers: [ChatEvents],
  exports: [ChatEvents],
})
export class RealtimeModule {}
