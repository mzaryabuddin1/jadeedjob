"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const post_entity_1 = require("./entities/post.entity");
const post_engagement_entities_1 = require("./entities/post-engagement.entities");
const posts_service_1 = require("./posts.service");
const post_engagement_service_1 = require("./post-engagement.service");
const post_engagement_notifier_1 = require("./post-engagement-notifier");
const post_analytics_service_1 = require("./post-analytics.service");
const post_stats_service_1 = require("./post-stats.service");
const posts_controller_1 = require("./posts.controller");
const post_engagement_controller_1 = require("./post-engagement.controller");
const post_analytics_controller_1 = require("./post-analytics.controller");
const media_module_1 = require("../media/media.module");
const pages_module_1 = require("../pages/pages.module");
const follow_module_1 = require("../follow/follow.module");
const notification_module_1 = require("../notification/notification.module");
const user_entity_1 = require("../users/entities/user.entity");
const page_entity_1 = require("../pages/entities/page.entity");
const page_member_entity_1 = require("../pages/entities/page-member.entity");
const job_entity_1 = require("../job/entities/job.entity");
const follow_entity_1 = require("../follow/follow.entity");
let PostsModule = class PostsModule {
};
exports.PostsModule = PostsModule;
exports.PostsModule = PostsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                post_entity_1.Post,
                post_engagement_entities_1.PostLike,
                post_engagement_entities_1.PostComment,
                post_engagement_entities_1.PostShare,
                post_engagement_entities_1.PostViewer,
                post_engagement_entities_1.PostStatsDaily,
                post_engagement_entities_1.PostHashtag,
                user_entity_1.User,
                page_entity_1.Page,
                page_member_entity_1.PageMember,
                job_entity_1.Job,
                follow_entity_1.Follow,
            ]),
            media_module_1.MediaModule,
            pages_module_1.PagesModule,
            follow_module_1.FollowModule,
            notification_module_1.NotificationModule,
        ],
        controllers: [
            posts_controller_1.PostsController,
            post_engagement_controller_1.PostEngagementController,
            post_analytics_controller_1.PostAnalyticsController,
        ],
        providers: [
            posts_service_1.PostsService,
            post_engagement_service_1.PostEngagementService,
            post_engagement_notifier_1.PostEngagementNotifier,
            post_analytics_service_1.PostAnalyticsService,
            post_stats_service_1.PostStatsService,
        ],
        exports: [posts_service_1.PostsService],
    })
], PostsModule);
//# sourceMappingURL=posts.module.js.map