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
exports.ProfilesController = void 0;
const common_1 = require("@nestjs/common");
const joi_1 = __importDefault(require("joi"));
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const profiles_service_1 = require("./profiles.service");
const profileSearchQuerySchema = joi_1.default.object({
    profileType: joi_1.default.string().valid('user', 'company').required(),
    q: joi_1.default.string().trim().min(2).max(80).required(),
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(30).default(20),
});
let ProfilesController = class ProfilesController {
    constructor(profilesService) {
        this.profilesService = profilesService;
    }
    searchProfiles(query) {
        return this.profilesService.searchProfiles(query);
    }
    getProfile(profileType, profileId, req) {
        return this.profilesService.getProfile(profileType, profileId, req.user.id);
    }
    follow(profileType, profileId, req) {
        return this.profilesService.follow(profileType, profileId, req.user.id);
    }
    unfollow(profileType, profileId, req) {
        return this.profilesService.unfollow(profileType, profileId, req.user.id);
    }
};
exports.ProfilesController = ProfilesController;
__decorate([
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)(new joi_validation_pipe_1.JoiValidationPipe(profileSearchQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProfilesController.prototype, "searchProfiles", null);
__decorate([
    (0, common_1.Get)(':profileType/:profileId'),
    __param(0, (0, common_1.Param)('profileType')),
    __param(1, (0, common_1.Param)('profileId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Object]),
    __metadata("design:returntype", void 0)
], ProfilesController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Post)(':profileType/:profileId/follow'),
    __param(0, (0, common_1.Param)('profileType')),
    __param(1, (0, common_1.Param)('profileId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Object]),
    __metadata("design:returntype", void 0)
], ProfilesController.prototype, "follow", null);
__decorate([
    (0, common_1.Delete)(':profileType/:profileId/follow'),
    __param(0, (0, common_1.Param)('profileType')),
    __param(1, (0, common_1.Param)('profileId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Object]),
    __metadata("design:returntype", void 0)
], ProfilesController.prototype, "unfollow", null);
exports.ProfilesController = ProfilesController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('profiles'),
    __metadata("design:paramtypes", [profiles_service_1.ProfilesService])
], ProfilesController);
//# sourceMappingURL=profiles.controller.js.map