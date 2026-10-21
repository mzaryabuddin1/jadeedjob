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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostEngagementController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const joi_1 = __importDefault(require("joi"));
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const post_engagement_service_1 = require("./post-engagement.service");
const commentSchema = joi_1.default.object({
    text: joi_1.default.string().trim().min(1).max(1000).required(),
    parentId: joi_1.default.number().integer().positive(),
});
const shareSchema = joi_1.default.object({
    channel: joi_1.default.string().valid('link', 'chat', 'external'),
});
const paging = (name = 'before') => (t, k, d) => {
    (0, swagger_1.ApiQuery)({
        name,
        required: false,
        description: 'cursor: `nextCursor` of the previous page',
    })(t, k, d);
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        example: 20,
        description: 'max 50',
    })(t, k, d);
};
let PostEngagementController = class PostEngagementController {
    constructor(engagement) {
        this.engagement = engagement;
    }
    like(id, req) {
        return this.engagement.like(req.user.id, id);
    }
    unlike(id, req) {
        return this.engagement.unlike(req.user.id, id);
    }
    likes(id, before, limit, req) {
        return this.engagement.listLikes(id, req.user.id, {
            before: Number(before) || undefined,
            limit: Number(limit) || undefined,
        });
    }
    comment(id, body, req) {
        return this.engagement.comment(req.user.id, id, body.text, body.parentId);
    }
    comments(id, before, limit, req) {
        return this.engagement.listComments(id, req.user.id, {
            before: Number(before) || undefined,
            limit: Number(limit) || undefined,
        });
    }
    replies(commentId, after, limit, req) {
        return this.engagement.listReplies(commentId, req.user.id, {
            after: Number(after) || undefined,
            limit: Number(limit) || undefined,
        });
    }
    deleteComment(commentId, req) {
        return this.engagement.deleteComment(req.user.id, commentId);
    }
    share(id, body, req) {
        return this.engagement.share(req.user.id, id, body?.channel ?? 'link');
    }
    shareLink(id, req) {
        return this.engagement.shareLink(id, req.user.id);
    }
};
exports.PostEngagementController = PostEngagementController;
__decorate([
    (0, common_1.Post)('posts/:id/like'),
    (0, swagger_1.ApiOperation)({
        summary: 'Like a post / reel',
        description: 'Idempotent (double taps count once). The author is notified in a batch ("Ali and 4 others liked your reel"), never one push per like.',
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], PostEngagementController.prototype, "like", null);
__decorate([
    (0, common_1.Delete)('posts/:id/like'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove my like' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], PostEngagementController.prototype, "unlike", null);
__decorate([
    (0, common_1.Get)('posts/:id/likes'),
    (0, swagger_1.ApiOperation)({ summary: 'Who liked it (newest first)' }),
    paging(),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('before')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String, Object]),
    __metadata("design:returntype", void 0)
], PostEngagementController.prototype, "likes", null);
__decorate([
    (0, common_1.Post)('posts/:id/comments'),
    (0, swagger_1.ApiOperation)({
        summary: 'Comment on a post / reel, or reply to a comment',
        description: 'Text 1-1000 characters. Send `parentId` to reply; replies are one level deep (a reply to a reply attaches to the top comment). The author / the replied person is notified in a batch.',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['text'],
            properties: {
                text: { type: 'string', example: 'Is this job still open?' },
                parentId: { type: 'number', example: 7 },
            },
        },
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(commentSchema))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], PostEngagementController.prototype, "comment", null);
__decorate([
    (0, common_1.Get)('posts/:id/comments'),
    (0, swagger_1.ApiOperation)({
        summary: 'Comments of a post (newest first)',
        description: 'Top-level comments only; each has `repliesCount` - load them with `GET /comments/:id/replies`.',
    }),
    paging(),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('before')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String, Object]),
    __metadata("design:returntype", void 0)
], PostEngagementController.prototype, "comments", null);
__decorate([
    (0, common_1.Get)('comments/:commentId/replies'),
    (0, swagger_1.ApiOperation)({ summary: 'Replies of a comment (oldest first)' }),
    paging('after'),
    __param(0, (0, common_1.Param)('commentId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('after')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String, Object]),
    __metadata("design:returntype", void 0)
], PostEngagementController.prototype, "replies", null);
__decorate([
    (0, common_1.Delete)('comments/:commentId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Delete a comment',
        description: "Allowed for the comment's author, the post's author and page owner/admin/editor. Deleting a top comment removes its replies too.",
    }),
    __param(0, (0, common_1.Param)('commentId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], PostEngagementController.prototype, "deleteComment", null);
__decorate([
    (0, common_1.Post)('posts/:id/share'),
    (0, swagger_1.ApiOperation)({
        summary: 'Record a share and get the link',
        description: 'Call it when the person shares (copies the link, sends it in chat, or uses the system share sheet). `channel`: `link` (default), `chat`, `external`. A person counts once per post. Returns `shareUrl` (set env `APP_SHARE_URL`, `{id}` = post id).',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                channel: { type: 'string', enum: ['link', 'chat', 'external'] },
            },
        },
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(shareSchema))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], PostEngagementController.prototype, "share", null);
__decorate([
    (0, common_1.Get)('posts/:id/share-link'),
    (0, swagger_1.ApiOperation)({ summary: 'The link to share (does not count as a share)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], PostEngagementController.prototype, "shareLink", null);
exports.PostEngagementController = PostEngagementController = __decorate([
    (0, swagger_1.ApiTags)('Posts & Reels'),
    (0, swagger_1.ApiBearerAuth)('JWT'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, throttler_1.Throttle)({ default: { limit: 300, ttl: 60000 } }),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [post_engagement_service_1.PostEngagementService])
], PostEngagementController);
//# sourceMappingURL=post-engagement.controller.js.map