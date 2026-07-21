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
exports.ProfilePublisherOptionsController = void 0;
const common_1 = require("@nestjs/common");
const joi_1 = __importDefault(require("joi"));
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const pages_service_1 = require("../pages/pages.service");
const publisherOptionsQuerySchema = joi_1.default.object({
    capability: joi_1.default.string().valid('publishContent').required(),
});
let ProfilePublisherOptionsController = class ProfilePublisherOptionsController {
    constructor(pagesService) {
        this.pagesService = pagesService;
    }
    getPublisherOptions(query, req) {
        return this.pagesService.getPublisherOptions(req.user.id, query.capability);
    }
};
exports.ProfilePublisherOptionsController = ProfilePublisherOptionsController;
__decorate([
    (0, common_1.Get)('publisher-options'),
    __param(0, (0, common_1.Query)(new joi_validation_pipe_1.JoiValidationPipe(publisherOptionsQuerySchema))),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProfilePublisherOptionsController.prototype, "getPublisherOptions", null);
exports.ProfilePublisherOptionsController = ProfilePublisherOptionsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('profiles'),
    __metadata("design:paramtypes", [pages_service_1.PagesService])
], ProfilePublisherOptionsController);
//# sourceMappingURL=profile-publisher-options.controller.js.map