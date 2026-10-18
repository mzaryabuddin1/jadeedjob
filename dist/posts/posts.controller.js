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
exports.PostsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const joi_1 = __importDefault(require("joi"));
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const posts_service_1 = require("./posts.service");
const createSchema = joi_1.default.object({
    kind: joi_1.default.string().valid('post', 'reel').required(),
    text: joi_1.default.string().trim().allow(''),
    mediaIds: joi_1.default.array().items(joi_1.default.number().integer().positive()).max(10),
    thumbnailMediaId: joi_1.default.number().integer().positive(),
    durationMs: joi_1.default.number().integer().positive(),
    jobId: joi_1.default.number().integer().positive(),
    pageId: joi_1.default.number().integer().positive(),
});
const updateSchema = joi_1.default.object({
    text: joi_1.default.string().trim().allow(''),
    jobId: joi_1.default.number().integer().positive().allow(null),
}).min(1);
const cursor = () => (t, k, d) => {
    (0, swagger_1.ApiQuery)({
        name: 'kind',
        required: false,
        enum: ['post', 'reel'],
        description: 'leave empty for both',
    })(t, k, d);
    (0, swagger_1.ApiQuery)({
        name: 'before',
        required: false,
        description: 'cursor: `nextCursor` of the previous page',
    })(t, k, d);
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        example: 10,
        description: 'max 30',
    })(t, k, d);
};
const opts = (kind, before, limit) => ({
    kind,
    before: Number(before) || undefined,
    limit: Number(limit) || undefined,
});
let PostsController = class PostsController {
    constructor(posts) {
        this.posts = posts;
    }
    create(body, req) {
        return this.posts.create(req.user.id, body);
    }
    feed(kind, before, limit, req) {
        return this.posts.feed(req.user.id, opts(kind, before, limit));
    }
    reels(page, limit, req) {
        return this.posts.reelsFeed(req.user.id, {
            page: Number(page) || undefined,
            limit: Number(limit) || undefined,
        });
    }
    getOne(id, req) {
        return this.posts.getOne(req.user.id, id);
    }
    update(id, body, req) {
        return this.posts.update(req.user.id, id, body);
    }
    remove(id, req) {
        return this.posts.remove(req.user.id, id);
    }
    userPosts(userId, kind, before, limit, req) {
        return this.posts.listByUser(req.user.id, userId, opts(kind, before, limit));
    }
    pagePosts(pageId, kind, before, limit, req) {
        return this.posts.listByPage(req.user.id, pageId, opts(kind, before, limit));
    }
};
exports.PostsController = PostsController;
__decorate([
    (0, common_1.Post)('posts'),
    (0, swagger_1.ApiOperation)({
        summary: 'Publish a post or a reel',
        description: [
            'Upload files first with `POST /media/upload`, then send their ids here.',
            '- **reel**: `kind: "reel"` + exactly one video id in `mediaIds` (+ optional `thumbnailMediaId` image, `durationMs` up to 180 000, caption up to 2200).',
            '- **post**: `kind: "post"` + text and/or up to 10 images, or one video (text up to 3000).',
            '- **as a page**: add `pageId` (needs the owner / admin / editor role of that page).',
            "- **tag a job**: `jobId` - your own job (as a page: that page's job).",
            '- `#hashtags` in the text become searchable and feed trending.',
        ].join('\n'),
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['kind'],
            properties: {
                kind: { type: 'string', enum: ['post', 'reel'], example: 'reel' },
                text: {
                    type: 'string',
                    example: 'We are hiring drivers in Karachi #hiring #drivers',
                },
                mediaIds: { type: 'array', items: { type: 'number' }, example: [12] },
                thumbnailMediaId: { type: 'number', example: 13 },
                durationMs: { type: 'number', example: 24000 },
                jobId: { type: 'number', example: 5 },
                pageId: { type: 'number', example: 2 },
            },
        },
    }),
    __param(0, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(createSchema))),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('posts/feed'),
    (0, swagger_1.ApiOperation)({
        summary: 'My feed: posts and reels of people and pages I follow (and mine)',
        description: 'Newest first with cursor paging. `kind=reel` gives a following-only reels feed.',
    }),
    cursor(),
    __param(0, (0, common_1.Query)('kind')),
    __param(1, (0, common_1.Query)('before')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "feed", null);
__decorate([
    (0, common_1.Get)('reels/feed'),
    (0, swagger_1.ApiOperation)({
        summary: 'Reels for you (discover)',
        description: 'Public reels ranked by how well they are doing right now (likes, comments, shares, views, decayed by age; last 30 days). Page by `page` number because the ranking moves.',
    }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, example: 1 }),
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        example: 10,
        description: 'max 30',
    }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "reels", null);
__decorate([
    (0, common_1.Get)('posts/:id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get one post / reel',
        description: 'Includes author, page, tagged job, counts and what *I* did (`viewer.liked`, `viewer.shared`, `viewer.canManage`).',
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "getOne", null);
__decorate([
    (0, common_1.Patch)('posts/:id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Edit text or tagged job',
        description: 'Author (or page owner/admin/editor for page posts). Media cannot be changed. `jobId: null` removes the tag.',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                text: { type: 'string' },
                jobId: { type: 'number', nullable: true },
            },
        },
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(updateSchema))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('posts/:id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Delete a post / reel (author, or page manager for page posts)',
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('users/:userId/posts'),
    (0, swagger_1.ApiOperation)({
        summary: 'Posts and reels a person published themselves',
        description: 'The profile grid. Content they published as a page is on the page instead.',
    }),
    cursor(),
    __param(0, (0, common_1.Param)('userId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('kind')),
    __param(2, (0, common_1.Query)('before')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String, String, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "userPosts", null);
__decorate([
    (0, common_1.Get)('pages/:pageId/posts'),
    (0, swagger_1.ApiOperation)({ summary: 'Posts and reels of a page' }),
    cursor(),
    __param(0, (0, common_1.Param)('pageId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('kind')),
    __param(2, (0, common_1.Query)('before')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String, String, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "pagePosts", null);
exports.PostsController = PostsController = __decorate([
    (0, swagger_1.ApiTags)('Posts & Reels'),
    (0, swagger_1.ApiBearerAuth)('JWT'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, throttler_1.Throttle)({ default: { limit: 300, ttl: 60000 } }),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [posts_service_1.PostsService])
], PostsController);
//# sourceMappingURL=posts.controller.js.map