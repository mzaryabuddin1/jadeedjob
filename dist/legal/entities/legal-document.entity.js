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
exports.LegalDocument = void 0;
const typeorm_1 = require("typeorm");
let LegalDocument = class LegalDocument {
};
exports.LegalDocument = LegalDocument;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], LegalDocument.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['terms', 'privacy', 'community_guidelines'],
    }),
    __metadata("design:type", String)
], LegalDocument.prototype, "documentType", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 80 }),
    __metadata("design:type", String)
], LegalDocument.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 200 }),
    __metadata("design:type", String)
], LegalDocument.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 1000 }),
    __metadata("design:type", String)
], LegalDocument.prototype, "contentUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], LegalDocument.prototype, "effectiveAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], LegalDocument.prototype, "publishedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], LegalDocument.prototype, "supersededAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], LegalDocument.prototype, "isCurrent", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], LegalDocument.prototype, "publishedByAdminId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], LegalDocument.prototype, "createdAt", void 0);
exports.LegalDocument = LegalDocument = __decorate([
    (0, typeorm_1.Entity)('legal_documents'),
    (0, typeorm_1.Unique)('UQ_legal_documents_type_version', ['documentType', 'version']),
    (0, typeorm_1.Index)('IDX_legal_documents_current', ['documentType', 'isCurrent'])
], LegalDocument);
//# sourceMappingURL=legal-document.entity.js.map