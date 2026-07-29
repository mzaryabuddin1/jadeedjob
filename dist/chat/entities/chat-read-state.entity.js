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
exports.ChatReadState = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const chat_conversation_entity_1 = require("./chat-conversation.entity");
let ChatReadState = class ChatReadState {
};
exports.ChatReadState = ChatReadState;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ChatReadState.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 36 }),
    __metadata("design:type", String)
], ChatReadState.prototype, "conversationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => chat_conversation_entity_1.ChatConversation, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({
        name: 'conversationId',
        foreignKeyConstraintName: 'FK_chat_read_states_conversation',
    }),
    __metadata("design:type", chat_conversation_entity_1.ChatConversation)
], ChatReadState.prototype, "conversation", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ChatReadState.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({
        name: 'userId',
        foreignKeyConstraintName: 'FK_chat_read_states_user',
    }),
    __metadata("design:type", user_entity_1.User)
], ChatReadState.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], ChatReadState.prototype, "lastReadMessageId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], ChatReadState.prototype, "readAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ChatReadState.prototype, "updatedAt", void 0);
exports.ChatReadState = ChatReadState = __decorate([
    (0, typeorm_1.Entity)('chat_read_states'),
    (0, typeorm_1.Unique)('UQ_chat_read_states_conversation_user', ['conversationId', 'userId']),
    (0, typeorm_1.Index)('IDX_chat_read_states_user_updated', ['userId', 'updatedAt'])
], ChatReadState);
//# sourceMappingURL=chat-read-state.entity.js.map