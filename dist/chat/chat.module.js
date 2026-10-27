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
const jwt_1 = require("@nestjs/jwt");
const job_application_entity_1 = require("../job-application/entities/job-application.entity");
const job_entity_1 = require("../job/entities/job.entity");
const page_entity_1 = require("../pages/entities/page.entity");
const user_entity_1 = require("../users/entities/user.entity");
const notification_module_1 = require("../notification/notification.module");
const chat_service_1 = require("./chat.service");
const chat_gateway_1 = require("./chat.gateway");
const chat_controller_1 = require("./chat.controller");
const conversations_controller_1 = require("./conversations.controller");
const conversations_service_1 = require("./conversations.service");
const messages_service_1 = require("./messages.service");
const realtime_module_1 = require("./realtime.module");
const chat_notifier_1 = require("./chat-notifier");
const chat_migration_service_1 = require("./chat-migration.service");
const chat_message_entity_1 = require("./entities/chat-message.entity");
const conversation_entity_1 = require("./entities/conversation.entity");
const conversation_member_entity_1 = require("./entities/conversation-member.entity");
const conversation_message_entity_1 = require("./entities/conversation-message.entity");
const user_block_entity_1 = require("./entities/user-block.entity");
let ChatModule = class ChatModule {
};
exports.ChatModule = ChatModule;
exports.ChatModule = ChatModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                chat_message_entity_1.ChatMessage,
                conversation_entity_1.Conversation,
                conversation_member_entity_1.ConversationMember,
                conversation_message_entity_1.ConversationMessage,
                user_block_entity_1.UserBlock,
                job_application_entity_1.JobApplication,
                job_entity_1.Job,
                page_entity_1.Page,
                user_entity_1.User,
            ]),
            jwt_1.JwtModule.register({
                secret: process.env.JWT_SECRET,
            }),
            notification_module_1.NotificationModule,
            realtime_module_1.RealtimeModule,
        ],
        providers: [
            chat_service_1.ChatService,
            chat_gateway_1.ChatGateway,
            conversations_service_1.ConversationsService,
            messages_service_1.MessagesService,
            chat_notifier_1.ChatNotifier,
            chat_migration_service_1.ChatMigration,
        ],
        controllers: [chat_controller_1.ChatController, conversations_controller_1.ConversationsController],
    })
], ChatModule);
//# sourceMappingURL=chat.module.js.map