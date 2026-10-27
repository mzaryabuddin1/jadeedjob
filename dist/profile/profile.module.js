"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const profile_controller_1 = require("./profile.controller");
const profile_service_1 = require("./profile.service");
const follow_module_1 = require("../follow/follow.module");
const user_entity_1 = require("../users/entities/user.entity");
const work_experience_entity_1 = require("../users/entities/work-experience.entity");
const education_entity_1 = require("../users/entities/education.entity");
const certification_entity_1 = require("../users/entities/certification.entity");
const user_language_entity_1 = require("../users/entities/user-language.entity");
const page_entity_1 = require("../pages/entities/page.entity");
const page_member_entity_1 = require("../pages/entities/page-member.entity");
const post_entity_1 = require("../posts/entities/post.entity");
let ProfileModule = class ProfileModule {
};
exports.ProfileModule = ProfileModule;
exports.ProfileModule = ProfileModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                user_entity_1.User,
                work_experience_entity_1.WorkExperience,
                education_entity_1.Education,
                certification_entity_1.Certification,
                user_language_entity_1.UserLanguage,
                page_entity_1.Page,
                page_member_entity_1.PageMember,
                post_entity_1.Post,
            ]),
            follow_module_1.FollowModule,
        ],
        controllers: [profile_controller_1.ProfileController],
        providers: [profile_service_1.ProfileService],
        exports: [profile_service_1.ProfileService],
    })
], ProfileModule);
//# sourceMappingURL=profile.module.js.map