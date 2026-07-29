"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const job_application_entity_1 = require("../job-application/entities/job-application.entity");
const job_entity_1 = require("../job/entities/job.entity");
const user_entity_1 = require("../users/entities/user.entity");
const chat_service_1 = require("./chat.service");
const chat_gateway_1 = require("./chat.gateway");
const chat_controller_1 = require("./chat.controller");
const chat_message_entity_1 = require("./entities/chat-message.entity");
const chats_controller_1 = require("./chats.controller");
const page_member_entity_1 = require("../pages/entities/page-member.entity");
const company_page_entity_1 = require("../pages/entities/company-page.entity");
const notifications_module_1 = require("../notifications/notifications.module");
const chat_conversation_entity_1 = require("./entities/chat-conversation.entity");
const chat_participant_entity_1 = require("./entities/chat-participant.entity");
const chat_read_state_entity_1 = require("./entities/chat-read-state.entity");
const job_invitation_entity_1 = require("./entities/job-invitation.entity");
const profile_chat_options_controller_1 = require("./profile-chat-options.controller");
const job_invitation_controller_1 = require("./job-invitation.controller");
let ChatModule = class ChatModule {
};
exports.ChatModule = ChatModule;
exports.ChatModule = ChatModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                chat_message_entity_1.ChatMessage,
                chat_conversation_entity_1.ChatConversation,
                chat_participant_entity_1.ChatParticipant,
                chat_read_state_entity_1.ChatReadState,
                job_invitation_entity_1.JobInvitation,
                job_application_entity_1.JobApplication,
                job_entity_1.Job,
                user_entity_1.User,
                page_member_entity_1.PageMember,
                company_page_entity_1.CompanyPage,
            ]),
            notifications_module_1.NotificationsModule,
        ],
        providers: [chat_service_1.ChatService, chat_gateway_1.ChatGateway],
        controllers: [
            chat_controller_1.ChatController,
            chats_controller_1.ChatsController,
            profile_chat_options_controller_1.ProfileChatOptionsController,
            job_invitation_controller_1.JobInvitationController,
        ],
        exports: [chat_service_1.ChatService, chat_gateway_1.ChatGateway],
    })
], ChatModule);
//# sourceMappingURL=chat.module.js.map