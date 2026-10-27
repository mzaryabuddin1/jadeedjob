"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const notification_inbox_service_1 = require("./notification-inbox.service");
let NotificationsController = class NotificationsController {
    constructor(inbox) {
        this.inbox = inbox;
    }
    list(before, limit, unreadOnly, type, req) {
        return this.inbox.list(req.user.id, {
            before: Number(before) || undefined,
            limit: Number(limit) || undefined,
            unreadOnly: unreadOnly === 'true' || unreadOnly === '1',
            type: type?.trim() || undefined,
        });
    }
    async unread(req) {
        return { unreadCount: await this.inbox.unreadCount(req.user.id) };
    }
    readAll(type, req) {
        return this.inbox.markAllRead(req.user.id, type?.trim() || undefined);
    }
    clear(onlyRead, req) {
        return this.inbox.clear(req.user.id, onlyRead === 'true' || onlyRead === '1');
    }
    read(id, req) {
        return this.inbox.markRead(req.user.id, id);
    }
    remove(id, req) {
        return this.inbox.remove(req.user.id, id);
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'My notifications (newest first)',
        description: [
            'Cursor paging for infinite scroll: pass the previous `nextCursor` as `before` until `hasMore` is false.',
            'Each item: `id`, `type`, `title`, `body`, `path` (deep link to open on tap), `data` (ids, names, ...), `read`, `readAt`, `createdAt`. The response also has `unreadCount` for the badge.',
            '`type` values: `job_created` (a new job in my interests), `job_application` (someone applied to my job), `application_accepted`, `new_follower`, `post_like`, `post_comment`, `page_invitation`, `page_invitation_accepted`, `page_verified`, `page_verification_rejected`, `page_unverified`. Chat messages are not here: they have their own inbox (`GET /chat/conversations`).',
            'Everything that is pushed is stored here too, even when push / email is turned off in settings.',
        ].join('\n'),
    }),
    (0, swagger_1.ApiQuery)({ name: 'before', required: false, description: 'cursor: `nextCursor` of the previous page' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, example: 20, description: 'max 50' }),
    (0, swagger_1.ApiQuery)({ name: 'unreadOnly', required: false, type: Boolean, example: false }),
    (0, swagger_1.ApiQuery)({ name: 'type', required: false, example: 'job_application', description: 'only this type' }),
    __param(0, (0, common_1.Query)('before')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('unreadOnly')),
    __param(3, (0, common_1.Query)('type')),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('unread-count'),
    (0, swagger_1.ApiOperation)({
        summary: 'Unread badge',
        description: 'Number of unread notifications. Refresh it when the socket event `notification:new` arrives.',
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "unread", null);
__decorate([
    (0, common_1.Post)('read-all'),
    (0, swagger_1.ApiOperation)({
        summary: 'Mark all as read',
        description: 'Optionally only one `type`.',
    }),
    (0, swagger_1.ApiQuery)({ name: 'type', required: false, example: 'new_follower' }),
    __param(0, (0, common_1.Query)('type')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "readAll", null);
__decorate([
    (0, common_1.Delete)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Clear my list',
        description: 'Deletes every notification, or only the ones already read with `onlyRead=true`.',
    }),
    (0, swagger_1.ApiQuery)({ name: 'onlyRead', required: false, type: Boolean, example: false }),
    __param(0, (0, common_1.Query)('onlyRead')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "clear", null);
__decorate([
    (0, common_1.Post)(':id/read'),
    (0, swagger_1.ApiOperation)({
        summary: 'Mark one as read',
        description: 'Idempotent. Call it when the person opens the notification. Returns the item and the new `unreadCount`.',
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "read", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete one notification' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "remove", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, swagger_1.ApiTags)('Notifications'),
    (0, swagger_1.ApiBearerAuth)('JWT'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, throttler_1.Throttle)({ default: { limit: 300, ttl: 60000 } }),
    (0, common_1.Controller)('notifications'),
    __metadata("design:paramtypes", [notification_inbox_service_1.NotificationInbox])
], NotificationsController);
//# sourceMappingURL=notifications.controller.js.map