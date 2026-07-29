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
exports.ChatParticipant = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const chat_conversation_entity_1 = require("./chat-conversation.entity");
let ChatParticipant = class ChatParticipant {
};
exports.ChatParticipant = ChatParticipant;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ChatParticipant.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 36 }),
    __metadata("design:type", String)
], ChatParticipant.prototype, "conversationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => chat_conversation_entity_1.ChatConversation, (conversation) => conversation.participants, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({
        name: 'conversationId',
        foreignKeyConstraintName: 'FK_chat_participants_conversation',
    }),
    __metadata("design:type", chat_conversation_entity_1.ChatConversation)
], ChatParticipant.prototype, "conversation", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ChatParticipant.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({
        name: 'userId',
        foreignKeyConstraintName: 'FK_chat_participants_user',
    }),
    __metadata("design:type", user_entity_1.User)
], ChatParticipant.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], ChatParticipant.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ChatParticipant.prototype, "createdAt", void 0);
exports.ChatParticipant = ChatParticipant = __decorate([
    (0, typeorm_1.Entity)('chat_participants'),
    (0, typeorm_1.Unique)('UQ_chat_participants_conversation_user', ['conversationId', 'userId']),
    (0, typeorm_1.Index)('IDX_chat_participants_user_conversation', ['userId', 'conversationId'])
], ChatParticipant);
//# sourceMappingURL=chat-participant.entity.js.map