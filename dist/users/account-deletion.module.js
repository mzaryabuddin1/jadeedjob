"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountDeletionModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const auth_session_entity_1 = require("../auth/entities/auth-session.entity");
const otp_module_1 = require("../otp/otp.module");
const company_page_entity_1 = require("../pages/entities/company-page.entity");
const profile_block_entity_1 = require("../profiles/entities/profile-block.entity");
const profile_follow_entity_1 = require("../profiles/entities/profile-follow.entity");
const stored_asset_entity_1 = require("../storage/entities/stored-asset.entity");
const twilio_module_1 = require("../twilio/twilio.module");
const account_deletion_controller_1 = require("./account-deletion.controller");
const account_deletion_service_1 = require("./account-deletion.service");
const account_deletion_request_entity_1 = require("./entities/account-deletion-request.entity");
const user_entity_1 = require("./entities/user.entity");
const users_module_1 = require("./users.module");
let AccountDeletionModule = class AccountDeletionModule {
};
exports.AccountDeletionModule = AccountDeletionModule;
exports.AccountDeletionModule = AccountDeletionModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                user_entity_1.User,
                account_deletion_request_entity_1.AccountDeletionRequest,
                company_page_entity_1.CompanyPage,
                auth_session_entity_1.AuthSession,
                profile_follow_entity_1.ProfileFollow,
                profile_block_entity_1.ProfileBlock,
                stored_asset_entity_1.StoredAsset,
            ]),
            otp_module_1.OtpModule,
            twilio_module_1.TwilioModule,
            users_module_1.UsersModule,
        ],
        controllers: [
            account_deletion_controller_1.AccountDeletionController,
            account_deletion_controller_1.AccountRecoveryController,
            account_deletion_controller_1.PublicAccountDeletionController,
        ],
        providers: [account_deletion_service_1.AccountDeletionService],
    })
], AccountDeletionModule);
//# sourceMappingURL=account-deletion.module.js.map