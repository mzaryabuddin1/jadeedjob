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
exports.JobApplication = void 0;
const typeorm_1 = require("typeorm");
const job_entity_1 = require("../../job/entities/job.entity");
const user_entity_1 = require("../../users/entities/user.entity");
const chat_message_entity_1 = require("../../chat/entities/chat-message.entity");
const rating_entity_1 = require("../../rating/entities/rating.entity");
let JobApplication = class JobApplication {
};
exports.JobApplication = JobApplication;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], JobApplication.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => job_entity_1.Job, (job) => job.applications, { onDelete: 'CASCADE' }),
    __metadata("design:type", job_entity_1.Job)
], JobApplication.prototype, "job", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], JobApplication.prototype, "jobId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.applications, {
        onDelete: 'CASCADE',
    }),
    __metadata("design:type", user_entity_1.User)
], JobApplication.prototype, "applicant", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], JobApplication.prototype, "applicantId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending',
    }),
    __metadata("design:type", String)
], JobApplication.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => chat_message_entity_1.ChatMessage, (msg) => msg.jobApplication),
    __metadata("design:type", Array)
], JobApplication.prototype, "messages", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => rating_entity_1.Rating, (rating) => rating.jobApplication),
    __metadata("design:type", Array)
], JobApplication.prototype, "ratings", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], JobApplication.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], JobApplication.prototype, "updatedAt", void 0);
exports.JobApplication = JobApplication = __decorate([
    (0, typeorm_1.Entity)('job_applications')
], JobApplication);
//# sourceMappingURL=job-application.entity.js.map