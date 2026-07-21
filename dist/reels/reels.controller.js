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
exports.ReelsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const crypto_1 = require("crypto");
const joi_1 = __importDefault(require("joi"));
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const reels_service_1 = require("./reels.service");
const reel_storage_service_1 = require("./reel-storage.service");
const createReelSchema = joi_1.default.object({
    caption: joi_1.default.string().trim().min(5).max(300).required(),
    category: joi_1.default.string().valid('community', 'jobs', 'social').required(),
    audioTitle: joi_1.default.string().trim().max(80).allow('', null).optional(),
    linkedJobId: joi_1.default.number().integer().positive().optional(),
    visibility: joi_1.default.string().valid('public', 'followers', 'draft').required(),
    allowComments: joi_1.default.boolean().required(),
    allowSharing: joi_1.default.boolean().required(),
    media: joi_1.default.object({
        fileName: joi_1.default.string().trim().max(255).required(),
        contentType: joi_1.default.string().trim().max(100).required(),
        fileSizeBytes: joi_1.default.number().integer().positive().optional(),
        durationSeconds: joi_1.default.number().positive().max(60).optional(),
    }).required(),
    publisher: joi_1.default.alternatives()
        .try(joi_1.default.object({
        type: joi_1.default.string().valid('user').required(),
    }), joi_1.default.object({
        type: joi_1.default.string().valid('company').required(),
        id: joi_1.default.number().integer().positive().required(),
    }))
        .optional(),
});
const feedQuerySchema = joi_1.default.object({
    feed: joi_1.default.string().valid('forYou', 'following', 'mine').default('forYou'),
    category: joi_1.default.string().valid('community', 'jobs', 'social').optional(),
    cursor: joi_1.default.string().optional(),
    limit: joi_1.default.number().integer().min(1).max(20).default(10),
    publisherType: joi_1.default.string().valid('user', 'company').optional(),
    publisherId: joi_1.default.number().integer().positive().optional(),
}).and('publisherType', 'publisherId');
const completeUploadSchema = joi_1.default.object({
    uploadId: joi_1.default.string().guid({ version: 'uuidv4' }).required(),
});
const addCommentSchema = joi_1.default.object({
    text: joi_1.default.string().trim().min(1).max(500).required(),
});
const uploadInterceptor = (0, platform_express_1.FileInterceptor)(reel_storage_service_1.REEL_VIDEO_FILE_FIELD, {
    storage: (0, multer_1.diskStorage)({
        destination: (_req, _file, callback) => {
            const uploadDir = (0, reel_storage_service_1.getReelTmpUploadDir)();
            (0, reel_storage_service_1.ensureDirectorySync)(uploadDir);
            callback(null, uploadDir);
        },
        filename: (_req, file, callback) => {
            const extension = (0, path_1.extname)(file.originalname || '').toLowerCase() || '.mp4';
            callback(null, `${Date.now()}-${(0, crypto_1.randomUUID)()}${extension}`);
        },
    }),
    limits: {
        fileSize: (0, reel_storage_service_1.getReelMaxFileSizeBytes)(),
    },
    fileFilter: (_req, file, callback) => {
        if (!(0, reel_storage_service_1.isAllowedReelMimeType)(file.mimetype) || !(0, reel_storage_service_1.isAllowedReelFileName)(file.originalname)) {
            callback(new common_1.BadRequestException('Unsupported reel video file'), false);
            return;
        }
        callback(null, true);
    },
});
let ReelsController = class ReelsController {
    constructor(reelsService) {
        this.reelsService = reelsService;
    }
    create(body, req) {
        return this.reelsService.createReel(body, req.user.id);
    }
    upload(id, uploadId, file, req) {
        if (!uploadId) {
            throw new common_1.BadRequestException('uploadId is required');
        }
        return this.reelsService.uploadLocalVideo(id, req.user.id, uploadId, file);
    }
    completeUpload(id, uploadId, req) {
        return this.reelsService.completeUpload(id, req.user.id, uploadId);
    }
    getFeed(query, req) {
        return this.reelsService.getFeed(query, req.user.id);
    }
    getPublisherOptions(req) {
        return this.reelsService.getPublisherOptions(req.user.id);
    }
    getReelsByAudio(audioId, query, req) {
        return this.reelsService.getReelsByAudio(audioId, req.user.id, query);
    }
    getAudio(id, req) {
        return this.reelsService.getReelAudio(id, req.user.id);
    }
    like(id, req) {
        return this.reelsService.likeReel(id, req.user.id);
    }
    unlike(id, req) {
        return this.reelsService.unlikeReel(id, req.user.id);
    }
    save(id, req) {
        return this.reelsService.saveReel(id, req.user.id);
    }
    unsave(id, req) {
        return this.reelsService.unsaveReel(id, req.user.id);
    }
    getComments(id, cursor, limit, req) {
        return this.reelsService.getComments(id, req.user.id, cursor, Number(limit));
    }
    addComment(id, text, req) {
        return this.reelsService.addComment(id, req.user.id, text);
    }
    share(id, req) {
        return this.reelsService.registerShare(id, req.user.id);
    }
    followCreator(creatorId, req) {
        return this.reelsService.followCreator(creatorId, req.user.id);
    }
    unfollowCreator(creatorId, req) {
        return this.reelsService.unfollowCreator(creatorId, req.user.id);
    }
    publish(id, req) {
        return this.reelsService.publishReel(id, req.user.id);
    }
    delete(id, req) {
        return this.reelsService.deleteReel(id, req.user.id);
    }
};
exports.ReelsController = ReelsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(createReelSchema)),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ReelsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/upload'),
    (0, common_1.UseInterceptors)(uploadInterceptor),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)('uploadId')),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, Object, Object]),
    __metadata("design:returntype", void 0)
], ReelsController.prototype, "upload", null);
__decorate([
    (0, common_1.Post)(':id/complete-upload'),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(completeUploadSchema)),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)('uploadId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, Object]),
    __metadata("design:returntype", void 0)
], ReelsController.prototype, "completeUpload", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)(new joi_validation_pipe_1.JoiValidationPipe(feedQuerySchema))),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ReelsController.prototype, "getFeed", null);
__decorate([
    (0, common_1.Get)('publisher-options'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ReelsController.prototype, "getPublisherOptions", null);
__decorate([
    (0, common_1.Get)('audio/:audioId/reels'),
    __param(0, (0, common_1.Param)('audioId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], ReelsController.prototype, "getReelsByAudio", null);
__decorate([
    (0, common_1.Get)(':id/audio'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ReelsController.prototype, "getAudio", null);
__decorate([
    (0, common_1.Post)(':id/like'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ReelsController.prototype, "like", null);
__decorate([
    (0, common_1.Delete)(':id/like'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ReelsController.prototype, "unlike", null);
__decorate([
    (0, common_1.Post)(':id/save'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ReelsController.prototype, "save", null);
__decorate([
    (0, common_1.Delete)(':id/save'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ReelsController.prototype, "unsave", null);
__decorate([
    (0, common_1.Get)(':id/comments'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('cursor')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, Number, Object]),
    __metadata("design:returntype", void 0)
], ReelsController.prototype, "getComments", null);
__decorate([
    (0, common_1.Post)(':id/comments'),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(addCommentSchema)),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)('text')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, Object]),
    __metadata("design:returntype", void 0)
], ReelsController.prototype, "addComment", null);
__decorate([
    (0, common_1.Post)(':id/share'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ReelsController.prototype, "share", null);
__decorate([
    (0, common_1.Post)('creators/:creatorId/follow'),
    __param(0, (0, common_1.Param)('creatorId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ReelsController.prototype, "followCreator", null);
__decorate([
    (0, common_1.Delete)('creators/:creatorId/follow'),
    __param(0, (0, common_1.Param)('creatorId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ReelsController.prototype, "unfollowCreator", null);
__decorate([
    (0, common_1.Post)(':id/publish'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ReelsController.prototype, "publish", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ReelsController.prototype, "delete", null);
exports.ReelsController = ReelsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('reels'),
    __metadata("design:paramtypes", [reels_service_1.ReelsService])
], ReelsController);
//# sourceMappingURL=reels.controller.js.map