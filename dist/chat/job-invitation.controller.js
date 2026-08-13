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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobInvitationController = void 0;
const common_1 = require("@nestjs/common");
const joi_1 = __importDefault(require("joi"));
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const chat_service_1 = require("./chat.service");
const chat_gateway_1 = require("./chat.gateway");
const swagger_1 = require("@nestjs/swagger");
const invitation_api_dto_1 = require("./dto/invitation-api.dto");
let JobInvitationController = class JobInvitationController {
    constructor(chatService, chatGateway) {
        this.chatService = chatService;
        this.chatGateway = chatGateway;
    }
    async updateInvitation(id, body, req) {
        const result = await this.chatService.updateInvitation(id, req.user.id, body.action);
        const updates = await this.chatService.invitationRealtimePayloads(id);
        this.chatGateway.emitInvitationUpdatedForUsers(updates);
        return result;
    }
};
exports.JobInvitationController = JobInvitationController;
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Accept, decline, or cancel a job invitation' }),
    (0, swagger_1.ApiBody)({ type: invitation_api_dto_1.UpdateInvitationDto }),
    (0, swagger_1.ApiOkResponse)({
        schema: {
            type: 'object',
            properties: {
                invitation: { $ref: '#/components/schemas/InvitationProjectionDto' },
                chatId: { type: 'string', format: 'uuid' },
                conversationId: { type: 'string', format: 'uuid' },
                applicationId: { type: 'string', nullable: true },
            },
        },
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        action: joi_1.default.string()
            .valid('accept', 'decline', 'cancel')
            .required(),
    })))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], JobInvitationController.prototype, "updateInvitation", null);
exports.JobInvitationController = JobInvitationController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('job-invitations'),
    (0, swagger_1.ApiTags)('Chat invitations'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiExtraModels)(invitation_api_dto_1.InvitationProjectionDto),
    __metadata("design:paramtypes", [chat_service_1.ChatService,
        chat_gateway_1.ChatGateway])
], JobInvitationController);
//# sourceMappingURL=job-invitation.controller.js.map