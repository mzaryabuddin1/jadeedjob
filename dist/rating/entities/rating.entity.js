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
exports.Rating = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const job_application_entity_1 = require("../../job-application/entities/job-application.entity");
const company_page_entity_1 = require("../../pages/entities/company-page.entity");
let Rating = class Rating {
};
exports.Rating = Rating;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Rating.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], Rating.prototype, "jobApplicationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => job_application_entity_1.JobApplication, (app) => app.ratings, {
        onDelete: 'CASCADE',
    }),
    __metadata("design:type", job_application_entity_1.JobApplication)
], Rating.prototype, "jobApplication", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], Rating.prototype, "givenBy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.ratingsGiven, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({
        name: 'givenBy',
        foreignKeyConstraintName: 'FK_ratings_given_by',
    }),
    __metadata("design:type", user_entity_1.User)
], Rating.prototype, "rater", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Rating.prototype, "givenTo", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.ratingsReceived, {
        nullable: true,
        onDelete: 'SET NULL',
    }),
    (0, typeorm_1.JoinColumn)({
        name: 'givenTo',
        foreignKeyConstraintName: 'FK_ratings_given_to',
    }),
    __metadata("design:type", user_entity_1.User)
], Rating.prototype, "ratedUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['worker', 'employer'] }),
    __metadata("design:type", String)
], Rating.prototype, "side", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['user', 'company'], default: 'user' }),
    __metadata("design:type", String)
], Rating.prototype, "targetType", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Rating.prototype, "targetUserId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({
        name: 'targetUserId',
        foreignKeyConstraintName: 'FK_ratings_target_user',
    }),
    __metadata("design:type", user_entity_1.User)
], Rating.prototype, "targetUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Rating.prototype, "targetCompanyId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_page_entity_1.CompanyPage, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({
        name: 'targetCompanyId',
        foreignKeyConstraintName: 'FK_ratings_target_company',
    }),
    __metadata("design:type", company_page_entity_1.CompanyPage)
], Rating.prototype, "targetCompany", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Rating.prototype, "legacyGrandfathered", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], Rating.prototype, "stars", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Rating.prototype, "comment", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Rating.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Rating.prototype, "updatedAt", void 0);
exports.Rating = Rating = __decorate([
    (0, typeorm_1.Entity)('ratings'),
    (0, typeorm_1.Unique)('UQ_ratings_application_side', ['jobApplicationId', 'side'])
], Rating);
//# sourceMappingURL=rating.entity.js.map