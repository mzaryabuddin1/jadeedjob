"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfilesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const user_entity_1 = require("../users/entities/user.entity");
const company_page_entity_1 = require("../pages/entities/company-page.entity");
const reel_creator_follow_entity_1 = require("../reels/entities/reel-creator-follow.entity");
const profile_follow_entity_1 = require("./entities/profile-follow.entity");
const profiles_controller_1 = require("./profiles.controller");
const profiles_service_1 = require("./profiles.service");
const pages_module_1 = require("../pages/pages.module");
const profile_publisher_options_controller_1 = require("./profile-publisher-options.controller");
const notifications_module_1 = require("../notifications/notifications.module");
let ProfilesModule = class ProfilesModule {
};
exports.ProfilesModule = ProfilesModule;
exports.ProfilesModule = ProfilesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            pages_module_1.PagesModule,
            notifications_module_1.NotificationsModule,
            typeorm_1.TypeOrmModule.forFeature([
                profile_follow_entity_1.ProfileFollow,
                reel_creator_follow_entity_1.ReelCreatorFollow,
                user_entity_1.User,
                company_page_entity_1.CompanyPage,
            ]),
        ],
        controllers: [profile_publisher_options_controller_1.ProfilePublisherOptionsController, profiles_controller_1.ProfilesController],
        providers: [profiles_service_1.ProfilesService],
        exports: [profiles_service_1.ProfilesService],
    })
], ProfilesModule);
//# sourceMappingURL=profiles.module.js.map