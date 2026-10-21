import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

/**
 * The bridge between the services (REST + sockets) and the socket server.
 *
 * Every connected user sits in a personal room `user:{id}` (all their
 * devices). A new message is emitted to the personal room of every member, so
 * the inbox updates live without joining one room per conversation.
 *
 * Scaling out: with several server instances add the socket.io Redis adapter
 * in the gateway - `emitToUsers` keeps working unchanged because it only
 * talks to rooms.
 */
@Injectable()
export class ChatEvents {
  private server: Server | null = null;
  /** userId -> open sockets on THIS instance */
  private readonly online = new Map<number, number>();

  attach(server: Server) {
    this.server = server;
  }

  connected(userId: number) {
    this.online.set(userId, (this.online.get(userId) ?? 0) + 1);
  }

  disconnected(userId: number) {
    const n = (this.online.get(userId) ?? 1) - 1;
    if (n <= 0) this.online.delete(userId);
    else this.online.set(userId, n);
  }

  /** online on this instance (a Redis presence set replaces this when scaled out) */
  isOnline(userId: number) {
    return this.online.has(userId);
  }

  emitToUsers(userIds: number[], event: string, payload: unknown) {
    if (!this.server) return;
    for (const id of new Set(userIds)) {
      this.server.to(`user:${id}`).emit(event, payload);
    }
  }
}
