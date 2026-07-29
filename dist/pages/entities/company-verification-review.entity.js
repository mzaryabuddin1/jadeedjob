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
exports.CompanyVerificationReview = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const company_page_entity_1 = require("./company-page.entity");
let CompanyVerificationReview = class CompanyVerificationReview {
};
exports.CompanyVerificationReview = CompanyVerificationReview;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], CompanyVerificationReview.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], CompanyVerificationReview.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_page_entity_1.CompanyPage, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({
        name: 'companyId',
        foreignKeyConstraintName: 'FK_company_verification_reviews_company',
    }),
    __metadata("design:type", company_page_entity_1.CompanyPage)
], CompanyVerificationReview.prototype, "company", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], CompanyVerificationReview.prototype, "actorUserId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({
        name: 'actorUserId',
        foreignKeyConstraintName: 'FK_company_verification_reviews_actor',
    }),
    __metadata("design:type", user_entity_1.User)
], CompanyVerificationReview.prototype, "actor", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 40 }),
    __metadata("design:type", String)
], CompanyVerificationReview.prototype, "previousStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 40 }),
    __metadata("design:type", String)
], CompanyVerificationReview.prototype, "nextStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], CompanyVerificationReview.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], CompanyVerificationReview.prototype, "submissionSnapshot", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CompanyVerificationReview.prototype, "createdAt", void 0);
exports.CompanyVerificationReview = CompanyVerificationReview = __decorate([
    (0, typeorm_1.Entity)('company_verification_reviews'),
    (0, typeorm_1.Index)('IDX_company_verification_reviews_company_created', [
        'companyId',
        'createdAt',
    ])
], CompanyVerificationReview);
//# sourceMappingURL=company-verification-review.entity.js.map