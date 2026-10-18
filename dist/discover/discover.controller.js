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
exports.DiscoverController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const discover_service_1 = require("./discover.service");
const paging = () => (t, k, d) => {
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, example: 1 })(t, k, d);
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        example: 20,
        description: 'max 50',
    })(t, k, d);
};
let DiscoverController = class DiscoverController {
    constructor(discover) {
        this.discover = discover;
    }
    users(q, page, limit, req) {
        return this.discover.searchUsers((0, discover_service_1.cleanQuery)(q), req.user.id, {
            page,
            limit,
        });
    }
    pages(q, page, limit, req) {
        return this.discover.searchPages((0, discover_service_1.cleanQuery)(q), req.user.id, {
            page,
            limit,
        });
    }
    posts(q, kind, page, limit, req) {
        return this.discover.searchPosts((0, discover_service_1.cleanQuery)(q), req.user.id, {
            kind,
            page,
            limit,
        });
    }
    reels(q, page, limit, req) {
        return this.discover.searchPosts((0, discover_service_1.cleanQuery)(q), req.user.id, {
            kind: 'reel',
            page,
            limit,
        });
    }
    hashtags(q) {
        return this.discover.hashtags((0, discover_service_1.cleanQuery)(q, 1));
    }
    search(q, req) {
        return this.discover.searchAll((0, discover_service_1.cleanQuery)(q), req.user.id);
    }
    home(req) {
        return this.discover.home(req.user.id);
    }
};
exports.DiscoverController = DiscoverController;
__decorate([
    (0, common_1.Get)('users'),
    (0, swagger_1.ApiOperation)({
        summary: 'Search people',
        description: 'Matches username, first/last name and headline (min 2 characters). Exact username first, then names starting with the text, then the most followed. Each result has `isFollowing` for the Follow button. Open a profile with `GET /users/:id/profile`.',
    }),
    (0, swagger_1.ApiQuery)({ name: 'q', required: true, example: 'ali' }),
    paging(),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], DiscoverController.prototype, "users", null);
__decorate([
    (0, common_1.Get)('pages'),
    (0, swagger_1.ApiOperation)({
        summary: 'Search pages',
        description: 'Matches page name, username, business name and industry. Verified and bigger pages rank first. Open a page with `GET /pages/:id`.',
    }),
    (0, swagger_1.ApiQuery)({ name: 'q', required: true, example: 'logistics' }),
    paging(),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], DiscoverController.prototype, "pages", null);
__decorate([
    (0, common_1.Get)('posts'),
    (0, swagger_1.ApiOperation)({
        summary: 'Search posts and reels',
        description: 'Words in the text, or a hashtag with `#` (e.g. `q=#hiring`). Popular and recent first. Items are the same post objects as the feeds (author, page, tagged job, counts, `viewer.liked`).',
    }),
    (0, swagger_1.ApiQuery)({ name: 'q', required: true, example: '#hiring' }),
    (0, swagger_1.ApiQuery)({ name: 'kind', required: false, enum: ['post', 'reel'] }),
    paging(),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('kind')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", void 0)
], DiscoverController.prototype, "posts", null);
__decorate([
    (0, common_1.Get)('reels'),
    (0, swagger_1.ApiOperation)({
        summary: 'Search reels only',
        description: 'Same as `/discover/posts` with `kind=reel`.',
    }),
    (0, swagger_1.ApiQuery)({ name: 'q', required: true, example: 'driver' }),
    paging(),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], DiscoverController.prototype, "reels", null);
__decorate([
    (0, common_1.Get)('hashtags'),
    (0, swagger_1.ApiOperation)({
        summary: 'Hashtag suggestions',
        description: 'Tags starting with the text, with how many live posts use them. Use while the person types `#...`.',
    }),
    (0, swagger_1.ApiQuery)({ name: 'q', required: true, example: 'hir' }),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DiscoverController.prototype, "hashtags", null);
__decorate([
    (0, common_1.Get)('search'),
    (0, swagger_1.ApiOperation)({
        summary: 'Search everything at once (the search box)',
        description: 'Returns 5 people, 5 pages, 5 posts, 5 reels and 5 hashtags for the text. Start the text with `#` to search hashtags and tagged posts only. Open a group with its own endpoint for more.',
    }),
    (0, swagger_1.ApiQuery)({ name: 'q', required: true, example: 'logistics' }),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DiscoverController.prototype, "search", null);
__decorate([
    (0, common_1.Get)('home'),
    (0, swagger_1.ApiOperation)({
        summary: 'Discover home (before the person types)',
        description: 'Trending hashtags (last 3 days), trending reels, people to follow (same city first, then most followed) and pages to follow (verified first). People/pages already followed are left out.',
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DiscoverController.prototype, "home", null);
exports.DiscoverController = DiscoverController = __decorate([
    (0, swagger_1.ApiTags)('Discover'),
    (0, swagger_1.ApiBearerAuth)('JWT'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, throttler_1.Throttle)({ default: { limit: 300, ttl: 60000 } }),
    (0, common_1.Controller)('discover'),
    __metadata("design:paramtypes", [discover_service_1.DiscoverService])
], DiscoverController);
//# sourceMappingURL=discover.controller.js.map