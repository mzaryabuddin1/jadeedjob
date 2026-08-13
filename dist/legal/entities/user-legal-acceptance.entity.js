"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserLegalAcceptance = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const legal_document_entity_1 = require("./legal-document.entity");
let UserLegalAcceptance = class UserLegalAcceptance {
};
exports.UserLegalAcceptance = UserLegalAcceptance;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], UserLegalAcceptance.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], UserLegalAcceptance.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({
        name: 'userId',
        foreignKeyConstraintName: 'FK_user_legal_acceptances_user',
    }),
    __metadata("design:type", user_entity_1.User)
], UserLegalAcceptance.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], UserLegalAcceptance.prototype, "legalDocumentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => legal_document_entity_1.LegalDocument, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({
        name: 'legalDocumentId',
        foreignKeyConstraintName: 'FK_user_legal_acceptances_document',
    }),
    __metadata("design:type", legal_document_entity_1.LegalDocument)
], UserLegalAcceptance.prototype, "legalDocument", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['terms', 'privacy', 'community_guidelines'],
    }),
    __metadata("design:type", String)
], UserLegalAcceptance.prototype, "documentType", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 80 }),
    __metadata("design:type", String)
], UserLegalAcceptance.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['ios', 'android', 'web', 'unknown'],
        default: 'unknown',
    }),
    __metadata("design:type", String)
], UserLegalAcceptance.prototype, "clientPlatform", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], UserLegalAcceptance.prototype, "acceptedAt", void 0);
exports.UserLegalAcceptance = UserLegalAcceptance = __decorate([
    (0, typeorm_1.Entity)('user_legal_acceptances'),
    (0, typeorm_1.Unique)('UQ_user_legal_acceptances_user_document', ['userId', 'legalDocumentId']),
    (0, typeorm_1.Index)('IDX_user_legal_acceptances_user_type', ['userId', 'documentType'])
], UserLegalAcceptance);
//# sourceMappingURL=user-legal-acceptance.entity.js.map