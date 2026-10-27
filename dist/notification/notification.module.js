"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const user_entity_1 = require("../users/entities/user.entity");
const firebase_module_1 = require("../firebase/firebase.module");
const notification_service_1 = require("./notification.service");
const mail_service_1 = require("./mail.service");
const notification_queue_entity_1 = require("./notification-queue.entity");
const notification_queue_service_1 = require("./notification-queue.service");
const notification_entity_1 = require("./notification.entity");
const notification_inbox_service_1 = require("./notification-inbox.service");
const notifications_controller_1 = require("./notifications.controller");
let NotificationModule = class NotificationModule {
};
exports.NotificationModule = NotificationModule;
exports.NotificationModule = NotificationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([user_entity_1.User, notification_queue_entity_1.NotificationQueueItem, notification_entity_1.Notification]),
            firebase_module_1.FirebaseModule,
        ],
        controllers: [notifications_controller_1.NotificationsController],
        providers: [
            notification_service_1.NotificationService,
            mail_service_1.MailService,
            notification_queue_service_1.NotificationQueueService,
            notification_inbox_service_1.NotificationInbox,
        ],
        exports: [
            notification_service_1.NotificationService,
            mail_service_1.MailService,
            notification_queue_service_1.NotificationQueueService,
            notification_inbox_service_1.NotificationInbox,
        ],
    })
], NotificationModule);
//# sourceMappingURL=notification.module.js.map