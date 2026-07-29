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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileChatOptionsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const chat_service_1 = require("./chat.service");
let ProfileChatOptionsController = class ProfileChatOptionsController {
    constructor(chatService) {
        this.chatService = chatService;
    }
    getChatOptions(profileType, profileId, req) {
        return this.chatService.getChatOptions(req.user.id, profileType, profileId);
    }
};
exports.ProfileChatOptionsController = ProfileChatOptionsController;
__decorate([
    (0, common_1.Get)(':profileType/:profileId/chat-options'),
    __param(0, (0, common_1.Param)('profileType')),
    __param(1, (0, common_1.Param)('profileId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Object]),
    __metadata("design:returntype", void 0)
], ProfileChatOptionsController.prototype, "getChatOptions", null);
exports.ProfileChatOptionsController = ProfileChatOptionsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('profiles'),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ProfileChatOptionsController);
//# sourceMappingURL=profile-chat-options.controller.js.map