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
exports.FirebaseController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const firebase_service_1 = require("./firebase.service");
let FirebaseController = class FirebaseController {
    constructor(firebaseService) {
        this.firebaseService = firebaseService;
    }
    async test(token) {
        return this.firebaseService.sendTestToToken(token);
    }
    async subscribeToFilter(filterId, token) {
        if (!filterId || !token) {
            return {
                success: false,
                message: 'filterId and token are required',
            };
        }
        await this.firebaseService.subscribeTokenToFilters(token, [filterId]);
        return {
            success: true,
            message: `Subscribed token to filter_${filterId}`,
        };
    }
};
exports.FirebaseController = FirebaseController;
__decorate([
    (0, common_1.Get)('test-notification'),
    (0, swagger_1.ApiOperation)({ summary: 'Send test push notification' }),
    (0, swagger_1.ApiQuery)({ name: 'token', required: true, description: 'FCM device token' }),
    __param(0, (0, common_1.Query)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FirebaseController.prototype, "test", null);
__decorate([
    (0, common_1.Post)('subscribe-filter'),
    (0, swagger_1.ApiOperation)({ summary: 'Subscribe FCM token to a filter topic' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['filterId', 'token'],
            properties: {
                filterId: { type: 'number', example: 1 },
                token: { type: 'string', example: 'YOUR_FCM_TOKEN' },
            },
        },
    }),
    __param(0, (0, common_1.Body)('filterId')),
    __param(1, (0, common_1.Body)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", Promise)
], FirebaseController.prototype, "subscribeToFilter", null);
exports.FirebaseController = FirebaseController = __decorate([
    (0, swagger_1.ApiTags)('Firebase'),
    (0, common_1.Controller)('firebase'),
    __metadata("design:paramtypes", [firebase_service_1.FirebaseService])
], FirebaseController);
//# sourceMappingURL=firebase.controller.js.map