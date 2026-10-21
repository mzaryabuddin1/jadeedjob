"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatEvents = void 0;
const common_1 = require("@nestjs/common");
let ChatEvents = class ChatEvents {
    constructor() {
        this.server = null;
        this.online = new Map();
    }
    attach(server) {
        this.server = server;
    }
    connected(userId) {
        this.online.set(userId, (this.online.get(userId) ?? 0) + 1);
    }
    disconnected(userId) {
        const n = (this.online.get(userId) ?? 1) - 1;
        if (n <= 0)
            this.online.delete(userId);
        else
            this.online.set(userId, n);
    }
    isOnline(userId) {
        return this.online.has(userId);
    }
    emitToUsers(userIds, event, payload) {
        if (!this.server)
            return;
        for (const id of new Set(userIds)) {
            this.server.to(`user:${id}`).emit(event, payload);
        }
    }
};
exports.ChatEvents = ChatEvents;
exports.ChatEvents = ChatEvents = __decorate([
    (0, common_1.Injectable)()
], ChatEvents);
//# sourceMappingURL=chat-events.service.js.map