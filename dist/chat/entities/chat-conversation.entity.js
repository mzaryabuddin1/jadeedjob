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
exports.ChatConversation = void 0;
const typeorm_1 = require("typeorm");
const job_application_entity_1 = require("../../job-application/entities/job-application.entity");
const job_entity_1 = require("../../job/entities/job.entity");
const chat_participant_entity_1 = require("./chat-participant.entity");
let ChatConversation = class ChatConversation {
};
exports.ChatConversation = ChatConversation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ChatConversation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['application', 'inquiry', 'invitation'],
    }),
    __metadata("design:type", String)
], ChatConversation.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], ChatConversation.prototype, "jobId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => job_entity_1.Job, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({
        name: 'jobId',
        foreignKeyConstraintName: 'FK_chat_conversations_job',
    }),
    __metadata("design:type", job_entity_1.Job)
], ChatConversation.prototype, "job", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], ChatConversation.prototype, "applicationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => job_application_entity_1.JobApplication, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({
        name: 'applicationId',
        foreignKeyConstraintName: 'FK_chat_conversations_application',
    }),
    __metadata("design:type", job_application_entity_1.JobApplication)
], ChatConversation.prototype, "application", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ChatConversation.prototype, "createdByUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], ChatConversation.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['active', 'read_only'],
        default: 'active',
    }),
    __metadata("design:type", String)
], ChatConversation.prototype, "writeState", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 120 }),
    __metadata("design:type", String)
], ChatConversation.prototype, "readOnlyReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 120 }),
    __metadata("design:type", String)
], ChatConversation.prototype, "clientRequestId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], ChatConversation.prototype, "lastActivityAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => chat_participant_entity_1.ChatParticipant, (participant) => participant.conversation),
    __metadata("design:type", Array)
], ChatConversation.prototype, "participants", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ChatConversation.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ChatConversation.prototype, "updatedAt", void 0);
exports.ChatConversation = ChatConversation = __decorate([
    (0, typeorm_1.Entity)('chat_conversations'),
    (0, typeorm_1.Unique)('UQ_chat_conversations_application', ['applicationId']),
    (0, typeorm_1.Index)('IDX_chat_conversations_job_activity', ['jobId', 'lastActivityAt'])
], ChatConversation);
//# sourceMappingURL=chat-conversation.entity.js.map