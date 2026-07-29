"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisIoAdapter = void 0;
const platform_socket_io_1 = require("@nestjs/platform-socket.io");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const redis_1 = require("redis");
class RedisIoAdapter extends platform_socket_io_1.IoAdapter {
    constructor(app) {
        super(app);
    }
    async connect() {
        const redisUrl = String(process.env.REDIS_URL || '').trim();
        if (!redisUrl)
            throw new Error('REDIS_URL is required');
        this.pubClient = (0, redis_1.createClient)({ url: redisUrl });
        this.subClient = this.pubClient.duplicate();
        await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
        this.adapterConstructor = (0, redis_adapter_1.createAdapter)(this.pubClient, this.subClient);
    }
    createIOServer(port, options) {
        const server = super.createIOServer(port, options);
        server.adapter(this.adapterConstructor);
        return server;
    }
}
exports.RedisIoAdapter = RedisIoAdapter;
//# sourceMappingURL=redis-io.adapter.js.map