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
const pages_controller_1 = require("./pages.controller");
const pages_service_1 = require("./pages.service");
const typeorm_1 = require("@nestjs/typeorm");
const company_page_entity_1 = require("./entities/company-page.entity");
const page_member_entity_1 = require("./entities/page-member.entity");
const user_entity_1 = require("../users/entities/user.entity");
const company_branch_entity_1 = require("./entities/company-branch.entity");
const employer_company_controller_1 = require("./employer-company.controller");
const admin_company_controller_1 = require("./admin-company.controller");
const company_access_request_entity_1 = require("./entities/company-access-request.entity");
const company_verification_review_entity_1 = require("./entities/company-verification-review.entity");
const notifications_module_1 = require("../notifications/notifications.module");
const auth_module_1 = require("../auth/auth.module");
let PagesModule = class PagesModule {
};
exports.PagesModule = PagesModule;
exports.PagesModule = PagesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                company_page_entity_1.CompanyPage,
                page_member_entity_1.PageMember,
                user_entity_1.User,
                company_branch_entity_1.CompanyBranch,
                company_access_request_entity_1.CompanyAccessRequest,
                company_verification_review_entity_1.CompanyVerificationReview,
            ]),
            notifications_module_1.NotificationsModule,
            auth_module_1.AuthModule,
        ],
        controllers: [
            pages_controller_1.PagesController,
            employer_company_controller_1.EmployerCompanyController,
            admin_company_controller_1.AdminCompanyController,
        ],
        providers: [pages_service_1.PagesService],
        exports: [pages_service_1.PagesService],
    })
], PagesModule);
//# sourceMappingURL=pages.module.js.map