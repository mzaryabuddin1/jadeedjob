"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PagesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const pages_controller_1 = require("./pages.controller");
const admin_page_verification_controller_1 = require("./admin-page-verification.controller");
const pages_service_1 = require("./pages.service");
const page_invitations_service_1 = require("./page-invitations.service");
const page_verification_service_1 = require("./page-verification.service");
const admin_key_guard_1 = require("./admin-key.guard");
const page_entity_1 = require("./entities/page.entity");
const page_member_entity_1 = require("./entities/page-member.entity");
const page_invitation_entity_1 = require("./entities/page-invitation.entity");
const page_verification_entity_1 = require("./entities/page-verification.entity");
const user_entity_1 = require("../users/entities/user.entity");
const job_entity_1 = require("../job/entities/job.entity");
const post_entity_1 = require("../posts/entities/post.entity");
const notification_module_1 = require("../notification/notification.module");
const follow_module_1 = require("../follow/follow.module");
let PagesModule = class PagesModule {
};
exports.PagesModule = PagesModule;
exports.PagesModule = PagesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                page_entity_1.Page,
                page_member_entity_1.PageMember,
                page_invitation_entity_1.PageInvitation,
                page_verification_entity_1.PageVerificationRequest,
                user_entity_1.User,
                job_entity_1.Job,
                post_entity_1.Post,
            ]),
            notification_module_1.NotificationModule,
            follow_module_1.FollowModule,
        ],
        controllers: [pages_controller_1.PagesController, admin_page_verification_controller_1.AdminPageVerificationController],
        providers: [
            pages_service_1.PagesService,
            page_invitations_service_1.PageInvitationsService,
            page_verification_service_1.PageVerificationService,
            admin_key_guard_1.AdminKeyGuard,
        ],
        exports: [pages_service_1.PagesService],
    })
], PagesModule);
//# sourceMappingURL=pages.module.js.map