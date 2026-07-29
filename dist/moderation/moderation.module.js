"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModerationModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const company_page_entity_1 = require("../pages/entities/company-page.entity");
const profile_block_entity_1 = require("../profiles/entities/profile-block.entity");
const profile_follow_entity_1 = require("../profiles/entities/profile-follow.entity");
const reel_creator_follow_entity_1 = require("../reels/entities/reel-creator-follow.entity");
const reel_report_entity_1 = require("../reels/entities/reel-report.entity");
const reel_entity_1 = require("../reels/entities/reel.entity");
const user_entity_1 = require("../users/entities/user.entity");
const admin_reel_report_controller_1 = require("./admin-reel-report.controller");
const moderation_service_1 = require("./moderation.service");
let ModerationModule = class ModerationModule {
};
exports.ModerationModule = ModerationModule;
exports.ModerationModule = ModerationModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                profile_block_entity_1.ProfileBlock,
                profile_follow_entity_1.ProfileFollow,
                reel_creator_follow_entity_1.ReelCreatorFollow,
                user_entity_1.User,
                company_page_entity_1.CompanyPage,
                reel_entity_1.Reel,
                reel_report_entity_1.ReelReport,
            ]),
        ],
        controllers: [admin_reel_report_controller_1.AdminReelReportController],
        providers: [moderation_service_1.ModerationService],
        exports: [moderation_service_1.ModerationService],
    })
], ModerationModule);
//# sourceMappingURL=moderation.module.js.map