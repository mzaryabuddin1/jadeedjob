"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const user_entity_1 = require("../users/entities/user.entity");
const firebase_module_1 = require("../firebase/firebase.module");
const notification_module_1 = require("../notification/notification.module");
const job_module_1 = require("../job/job.module");
const job_application_module_1 = require("../job-application/job-application.module");
const job_entity_1 = require("../job/entities/job.entity");
const job_application_entity_1 = require("../job-application/entities/job-application.entity");
const notification_queue_entity_1 = require("../notification/notification-queue.entity");
const fcm_lab_controller_1 = require("./fcm-lab.controller");
let DebugModule = class DebugModule {
};
exports.DebugModule = DebugModule;
exports.DebugModule = DebugModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                user_entity_1.User,
                job_entity_1.Job,
                job_application_entity_1.JobApplication,
                notification_queue_entity_1.NotificationQueueItem,
            ]),
            firebase_module_1.FirebaseModule,
            notification_module_1.NotificationModule,
            job_module_1.JobModule,
            job_application_module_1.JobApplicationModule,
        ],
        controllers: [fcm_lab_controller_1.FcmLabController],
        providers: [fcm_lab_controller_1.DebugLabGuard],
    })
], DebugModule);
//# sourceMappingURL=debug.module.js.map