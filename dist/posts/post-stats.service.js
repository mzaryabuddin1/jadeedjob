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
exports.PostStatsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const post_engagement_entities_1 = require("./entities/post-engagement.entities");
const COLUMNS = [
    'impressions',
    'views',
    'newViewers',
    'watchTimeMs',
    'completions',
    'likes',
    'comments',
    'shares',
];
let PostStatsService = class PostStatsService {
    constructor(repo) {
        this.repo = repo;
    }
    async bump(postId, delta) {
        const values = COLUMNS.map((c) => Math.max(0, Math.round(delta[c] ?? 0)));
        if (!values.some(Boolean))
            return;
        await this.repo.query(`INSERT INTO post_stats_daily
         (postId, day, ${COLUMNS.join(', ')})
       VALUES (?, UTC_DATE(), ${COLUMNS.map(() => '?').join(', ')})
       ON DUPLICATE KEY UPDATE
         ${COLUMNS.map((c) => `${c} = ${c} + VALUES(${c})`).join(', ')}`, [postId, ...values]);
    }
};
exports.PostStatsService = PostStatsService;
exports.PostStatsService = PostStatsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(post_engagement_entities_1.PostStatsDaily)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PostStatsService);
//# sourceMappingURL=post-stats.service.js.map