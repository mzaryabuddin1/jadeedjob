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
const job_entity_1 = require("../job/entities/job.entity");
const pages_module_1 = require("../pages/pages.module");
const profile_follow_entity_1 = require("../profiles/entities/profile-follow.entity");
const user_entity_1 = require("../users/entities/user.entity");
const community_post_entity_1 = require("./entities/community-post.entity");
const post_comment_entity_1 = require("./entities/post-comment.entity");
const post_like_entity_1 = require("./entities/post-like.entity");
const post_report_entity_1 = require("./entities/post-report.entity");
const post_save_entity_1 = require("./entities/post-save.entity");
const post_video_upload_session_entity_1 = require("./entities/post-video-upload-session.entity");
const post_storage_service_1 = require("./post-storage.service");
const post_video_storage_service_1 = require("./post-video-storage.service");
const posts_controller_1 = require("./posts.controller");
const posts_service_1 = require("./posts.service");
const notifications_module_1 = require("../notifications/notifications.module");
const public_posts_controller_1 = require("./public-posts.controller");
let PostsModule = class PostsModule {
};
exports.PostsModule = PostsModule;
exports.PostsModule = PostsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                community_post_entity_1.CommunityPost,
                post_like_entity_1.PostLike,
                post_save_entity_1.PostSave,
                post_comment_entity_1.PostComment,
                post_report_entity_1.PostReport,
                post_video_upload_session_entity_1.PostVideoUploadSession,
                profile_follow_entity_1.ProfileFollow,
                job_entity_1.Job,
                user_entity_1.User,
            ]),
            pages_module_1.PagesModule,
            notifications_module_1.NotificationsModule,
        ],
        controllers: [posts_controller_1.PostsController, public_posts_controller_1.PublicPostsController],
        providers: [posts_service_1.PostsService, post_storage_service_1.PostStorageService, post_video_storage_service_1.PostVideoStorageService],
        exports: [posts_service_1.PostsService],
    })
], PostsModule);
//# sourceMappingURL=posts.module.js.map