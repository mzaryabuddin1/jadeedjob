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
exports.CompanyAccessRequest = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const company_page_entity_1 = require("./company-page.entity");
let CompanyAccessRequest = class CompanyAccessRequest {
};
exports.CompanyAccessRequest = CompanyAccessRequest;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], CompanyAccessRequest.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], CompanyAccessRequest.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_page_entity_1.CompanyPage, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({
        name: 'companyId',
        foreignKeyConstraintName: 'FK_company_access_requests_company',
    }),
    __metadata("design:type", company_page_entity_1.CompanyPage)
], CompanyAccessRequest.prototype, "company", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], CompanyAccessRequest.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({
        name: 'userId',
        foreignKeyConstraintName: 'FK_company_access_requests_user',
    }),
    __metadata("design:type", user_entity_1.User)
], CompanyAccessRequest.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending',
    }),
    __metadata("design:type", String)
], CompanyAccessRequest.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], CompanyAccessRequest.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['admin', 'editor'],
        default: 'editor',
    }),
    __metadata("design:type", String)
], CompanyAccessRequest.prototype, "requestedRole", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], CompanyAccessRequest.prototype, "reviewReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], CompanyAccessRequest.prototype, "reviewedByUserId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({
        name: 'reviewedByUserId',
        foreignKeyConstraintName: 'FK_company_access_requests_reviewer',
    }),
    __metadata("design:type", user_entity_1.User)
], CompanyAccessRequest.prototype, "reviewedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], CompanyAccessRequest.prototype, "reviewedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 120 }),
    __metadata("design:type", String)
], CompanyAccessRequest.prototype, "clientRequestId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CompanyAccessRequest.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], CompanyAccessRequest.prototype, "updatedAt", void 0);
exports.CompanyAccessRequest = CompanyAccessRequest = __decorate([
    (0, typeorm_1.Entity)('company_access_requests'),
    (0, typeorm_1.Index)('IDX_company_access_requests_company_status', ['companyId', 'status']),
    (0, typeorm_1.Index)('IDX_company_access_requests_user_status', ['userId', 'status'])
], CompanyAccessRequest);
//# sourceMappingURL=company-access-request.entity.js.map