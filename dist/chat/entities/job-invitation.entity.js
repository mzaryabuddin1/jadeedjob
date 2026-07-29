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
exports.JobInvitation = void 0;
const typeorm_1 = require("typeorm");
const job_entity_1 = require("../../job/entities/job.entity");
const user_entity_1 = require("../../users/entities/user.entity");
const chat_conversation_entity_1 = require("./chat-conversation.entity");
let JobInvitation = class JobInvitation {
};
exports.JobInvitation = JobInvitation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], JobInvitation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 36 }),
    __metadata("design:type", String)
], JobInvitation.prototype, "conversationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => chat_conversation_entity_1.ChatConversation, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({
        name: 'conversationId',
        foreignKeyConstraintName: 'FK_job_invitations_conversation',
    }),
    __metadata("design:type", chat_conversation_entity_1.ChatConversation)
], JobInvitation.prototype, "conversation", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], JobInvitation.prototype, "jobId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => job_entity_1.Job, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({
        name: 'jobId',
        foreignKeyConstraintName: 'FK_job_invitations_job',
    }),
    __metadata("design:type", job_entity_1.Job)
], JobInvitation.prototype, "job", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], JobInvitation.prototype, "inviterUserId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({
        name: 'inviterUserId',
        foreignKeyConstraintName: 'FK_job_invitations_inviter',
    }),
    __metadata("design:type", user_entity_1.User)
], JobInvitation.prototype, "inviter", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], JobInvitation.prototype, "inviteeUserId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({
        name: 'inviteeUserId',
        foreignKeyConstraintName: 'FK_job_invitations_invitee',
    }),
    __metadata("design:type", user_entity_1.User)
], JobInvitation.prototype, "invitee", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['pending', 'accepted', 'declined', 'cancelled', 'expired'],
        default: 'pending',
    }),
    __metadata("design:type", String)
], JobInvitation.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], JobInvitation.prototype, "respondedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], JobInvitation.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 120 }),
    __metadata("design:type", String)
], JobInvitation.prototype, "clientRequestId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], JobInvitation.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], JobInvitation.prototype, "updatedAt", void 0);
exports.JobInvitation = JobInvitation = __decorate([
    (0, typeorm_1.Entity)('job_invitations'),
    (0, typeorm_1.Index)('IDX_job_invitations_invitee_status', ['inviteeUserId', 'status']),
    (0, typeorm_1.Index)('IDX_job_invitations_job_invitee', ['jobId', 'inviteeUserId']),
    (0, typeorm_1.Unique)('UQ_job_invitations_conversation', ['conversationId'])
], JobInvitation);
//# sourceMappingURL=job-invitation.entity.js.map