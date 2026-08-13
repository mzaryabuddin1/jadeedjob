"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegalModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const community_guidelines_guard_1 = require("./community-guidelines.guard");
const legal_controller_1 = require("./legal.controller");
const legal_document_entity_1 = require("./entities/legal-document.entity");
const user_legal_acceptance_entity_1 = require("./entities/user-legal-acceptance.entity");
const legal_service_1 = require("./legal.service");
let LegalModule = class LegalModule {
};
exports.LegalModule = LegalModule;
exports.LegalModule = LegalModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([legal_document_entity_1.LegalDocument, user_legal_acceptance_entity_1.UserLegalAcceptance])],
        controllers: [legal_controller_1.LegalController, legal_controller_1.UserLegalAcceptancesController],
        providers: [legal_service_1.LegalService, community_guidelines_guard_1.CommunityGuidelinesGuard],
        exports: [legal_service_1.LegalService, community_guidelines_guard_1.CommunityGuidelinesGuard],
    })
], LegalModule);
//# sourceMappingURL=legal.module.js.map