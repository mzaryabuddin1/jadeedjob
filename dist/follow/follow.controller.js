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
exports.FollowController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const follow_service_1 = require("./follow.service");
const cursorQueries = [
    (0, swagger_1.ApiQuery)({
        name: 'before',
        required: false,
        description: 'cursor: the `nextCursor` of the previous page',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        example: 20,
        description: 'max 50',
    }),
];
const withCursor = () => (t, k, d) => {
    cursorQueries.forEach((q) => q(t, k, d));
};
let FollowController = class FollowController {
    constructor(follows) {
        this.follows = follows;
    }
    followUser(userId, req) {
        return this.follows.follow(req.user.id, 'user', userId);
    }
    unfollowUser(userId, req) {
        return this.follows.unfollow(req.user.id, 'user', userId);
    }
    userFollowers(userId, before, limit, req) {
        return this.follows.listFollowers('user', userId, req.user.id, {
            before: Number(before) || undefined,
            limit: Number(limit),
        });
    }
    userFollowing(userId, type, before, limit, req) {
        const kind = type === 'users' || type === 'pages' ? type : 'all';
        return this.follows.listFollowing(userId, kind, req.user.id, {
            before: Number(before) || undefined,
            limit: Number(limit),
        });
    }
    followPage(pageId, req) {
        return this.follows.follow(req.user.id, 'page', pageId);
    }
    unfollowPage(pageId, req) {
        return this.follows.unfollow(req.user.id, 'page', pageId);
    }
    pageFollowers(pageId, before, limit, req) {
        return this.follows.listFollowers('page', pageId, req.user.id, {
            before: Number(before) || undefined,
            limit: Number(limit),
        });
    }
};
exports.FollowController = FollowController;
__decorate([
    (0, common_1.Post)('users/:userId/follow'),
    (0, swagger_1.ApiOperation)({
        summary: 'Follow a user',
        description: 'Idempotent: following twice is fine (`created` tells if it was new). Returns the new `followersCount`.',
    }),
    __param(0, (0, common_1.Param)('userId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], FollowController.prototype, "followUser", null);
__decorate([
    (0, common_1.Delete)('users/:userId/follow'),
    (0, swagger_1.ApiOperation)({ summary: 'Unfollow a user' }),
    __param(0, (0, common_1.Param)('userId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], FollowController.prototype, "unfollowUser", null);
__decorate([
    (0, common_1.Get)('users/:userId/followers'),
    (0, swagger_1.ApiOperation)({
        summary: 'Followers of a user',
        description: 'Newest first with cursor paging. Each person carries `isFollowing` (do I follow them) so the app can render the Follow button.',
    }),
    withCursor(),
    __param(0, (0, common_1.Param)('userId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('before')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String, Object]),
    __metadata("design:returntype", void 0)
], FollowController.prototype, "userFollowers", null);
__decorate([
    (0, common_1.Get)('users/:userId/following'),
    (0, swagger_1.ApiOperation)({
        summary: 'Who a user follows (people and pages)',
        description: '`type`: `users`, `pages` or `all` (default). Each entry says `type: user | page`.',
    }),
    (0, swagger_1.ApiQuery)({ name: 'type', required: false, enum: ['all', 'users', 'pages'] }),
    withCursor(),
    __param(0, (0, common_1.Param)('userId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('type')),
    __param(2, (0, common_1.Query)('before')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String, String, Object]),
    __metadata("design:returntype", void 0)
], FollowController.prototype, "userFollowing", null);
__decorate([
    (0, common_1.Post)('pages/:pageId/follow'),
    (0, swagger_1.ApiOperation)({
        summary: 'Follow a page',
        description: "Idempotent. Followers see the page's posts and reels in their feed.",
    }),
    __param(0, (0, common_1.Param)('pageId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], FollowController.prototype, "followPage", null);
__decorate([
    (0, common_1.Delete)('pages/:pageId/follow'),
    (0, swagger_1.ApiOperation)({ summary: 'Unfollow a page' }),
    __param(0, (0, common_1.Param)('pageId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], FollowController.prototype, "unfollowPage", null);
__decorate([
    (0, common_1.Get)('pages/:pageId/followers'),
    (0, swagger_1.ApiOperation)({ summary: 'Followers of a page' }),
    withCursor(),
    __param(0, (0, common_1.Param)('pageId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('before')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String, Object]),
    __metadata("design:returntype", void 0)
], FollowController.prototype, "pageFollowers", null);
exports.FollowController = FollowController = __decorate([
    (0, swagger_1.ApiTags)('Follow'),
    (0, swagger_1.ApiBearerAuth)('JWT'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, throttler_1.Throttle)({ default: { limit: 300, ttl: 60000 } }),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [follow_service_1.FollowService])
], FollowController);
//# sourceMappingURL=follow.controller.js.map