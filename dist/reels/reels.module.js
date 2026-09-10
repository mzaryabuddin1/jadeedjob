"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReelsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const job_entity_1 = require("../job/entities/job.entity");
const user_entity_1 = require("../users/entities/user.entity");
const reel_entity_1 = require("./entities/reel.entity");
const reel_comment_entity_1 = require("./entities/reel-comment.entity");
const reel_creator_follow_entity_1 = require("./entities/reel-creator-follow.entity");
const reel_like_entity_1 = require("./entities/reel-like.entity");
const reel_save_entity_1 = require("./entities/reel-save.entity");
const reel_upload_session_entity_1 = require("./entities/reel-upload-session.entity");
const reel_storage_service_1 = require("./reel-storage.service");
const reels_controller_1 = require("./reels.controller");
const reels_service_1 = require("./reels.service");
const profile_follow_entity_1 = require("../profiles/entities/profile-follow.entity");
const profiles_module_1 = require("../profiles/profiles.module");
const pages_module_1 = require("../pages/pages.module");
const notifications_module_1 = require("../notifications/notifications.module");
const public_reels_controller_1 = require("./public-reels.controller");
let ReelsModule = class ReelsModule {
};
exports.ReelsModule = ReelsModule;
exports.ReelsModule = ReelsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                reel_entity_1.Reel,
                reel_upload_session_entity_1.ReelUploadSession,
                reel_like_entity_1.ReelLike,
                reel_save_entity_1.ReelSave,
                reel_comment_entity_1.ReelComment,
                reel_creator_follow_entity_1.ReelCreatorFollow,
                job_entity_1.Job,
                user_entity_1.User,
                profile_follow_entity_1.ProfileFollow,
            ]),
            pages_module_1.PagesModule,
            profiles_module_1.ProfilesModule,
            notifications_module_1.NotificationsModule,
        ],
        controllers: [reels_controller_1.ReelsController, public_reels_controller_1.PublicReelsController],
        providers: [reels_service_1.ReelsService, reel_storage_service_1.ReelStorageService],
    })
], ReelsModule);
//# sourceMappingURL=reels.module.js.map