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
exports.RatingController = void 0;
const common_1 = require("@nestjs/common");
const rating_service_1 = require("./rating.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const joi_1 = __importDefault(require("joi"));
let RatingController = class RatingController {
    constructor(ratingService) {
        this.ratingService = ratingService;
    }
    async rate(body, req) {
        return this.ratingService.rateUser(req.user.id, body.jobApplicationId, body.stars, body.comment ?? '');
    }
};
exports.RatingController = RatingController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(joi_1.default.object({
        jobApplicationId: joi_1.default.number().required(),
        stars: joi_1.default.number().integer().min(1).max(5).required(),
        comment: joi_1.default.string().allow('').optional(),
    }))),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RatingController.prototype, "rate", null);
exports.RatingController = RatingController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('ratings'),
    __metadata("design:paramtypes", [rating_service_1.RatingService])
], RatingController);
//# sourceMappingURL=rating.controller.js.map