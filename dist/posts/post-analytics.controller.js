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
exports.PostAnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const joi_1 = __importDefault(require("joi"));
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const post_analytics_service_1 = require("./post-analytics.service");
const eventsSchema = joi_1.default.object({
    events: joi_1.default.array()
        .items(joi_1.default.object({
        postId: joi_1.default.number().integer().positive().required(),
        type: joi_1.default.string().valid('impression', 'view').required(),
        watchMs: joi_1.default.number().integer().min(0).max(36_000_000),
        completed: joi_1.default.boolean(),
    }))
        .min(1)
        .max(50)
        .required(),
});
let PostAnalyticsController = class PostAnalyticsController {
    constructor(analytics) {
        this.analytics = analytics;
    }
    events(body, req) {
        return this.analytics.record(req.user.id, body.events);
    }
    postAnalytics(id, days, req) {
        return this.analytics.postAnalytics(req.user.id, id, Number(days) || 7);
    }
    overview(days, pageId, req) {
        return this.analytics.overview(req.user.id, Number(days) || 30, Number(pageId) || undefined);
    }
};
exports.PostAnalyticsController = PostAnalyticsController;
__decorate([
    (0, common_1.Post)('posts/events'),
    (0, swagger_1.ApiOperation)({
        summary: 'Report impressions and views (batched)',
        description: [
            'The app collects events and sends them every few seconds (1-50 per call) instead of one request per scroll.',
            '- `impression`: the post/reel appeared in a feed.',
            '- `view`: the person actually watched or opened it. For reels send `watchMs` (how long they watched) and `completed: true` when they reached the end.',
            'Views of your own content, deleted posts and unknown ids are ignored. Returns `{ accepted, ignored }`.',
        ].join('\n'),
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['events'],
            properties: {
                events: {
                    type: 'array',
                    items: {
                        type: 'object',
                        required: ['postId', 'type'],
                        properties: {
                            postId: { type: 'number', example: 12 },
                            type: { type: 'string', enum: ['impression', 'view'] },
                            watchMs: { type: 'number', example: 18000 },
                            completed: { type: 'boolean', example: false },
                        },
                    },
                },
            },
        },
    }),
    __param(0, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(eventsSchema))),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PostAnalyticsController.prototype, "events", null);
__decorate([
    (0, common_1.Get)('posts/:id/analytics'),
    (0, swagger_1.ApiOperation)({
        summary: 'Performance of one post / reel',
        description: [
            'Author only (page posts: page owner or admin).',
            '`totals` and `daily` cover the last `days` (UTC days, zero-filled); `lifetime` are all-time counters (`reach` = unique viewers).',
            '`rates`: viewRate = views / impressions, avgWatchMs, completionRate = completed views / views, engagementRate = (likes + comments + shares) / views.',
            '`likes` per day are new likes (an unlike does not reduce a past day).',
        ].join('\n'),
    }),
    (0, swagger_1.ApiQuery)({ name: 'days', required: false, example: 7, description: '1-90' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('days')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, Object]),
    __metadata("design:returntype", void 0)
], PostAnalyticsController.prototype, "postAnalytics", null);
__decorate([
    (0, common_1.Get)('analytics/overview'),
    (0, swagger_1.ApiOperation)({
        summary: 'Overview of everything I (or my page) published',
        description: 'Totals and daily series for the period, posts vs reels, followers gained per day, number published and the top 5 posts by views. Add `pageId` for a page (owner / admin).',
    }),
    (0, swagger_1.ApiQuery)({ name: 'days', required: false, example: 30, description: '1-90' }),
    (0, swagger_1.ApiQuery)({ name: 'pageId', required: false }),
    __param(0, (0, common_1.Query)('days')),
    __param(1, (0, common_1.Query)('pageId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], PostAnalyticsController.prototype, "overview", null);
exports.PostAnalyticsController = PostAnalyticsController = __decorate([
    (0, swagger_1.ApiTags)('Analytics'),
    (0, swagger_1.ApiBearerAuth)('JWT'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, throttler_1.Throttle)({ default: { limit: 240, ttl: 60000 } }),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [post_analytics_service_1.PostAnalyticsService])
], PostAnalyticsController);
//# sourceMappingURL=post-analytics.controller.js.map