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
exports.PostsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const crypto_1 = require("crypto");
const joi_1 = __importDefault(require("joi"));
const multer_1 = require("multer");
const path_1 = require("path");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const post_storage_service_1 = require("./post-storage.service");
const post_video_storage_service_1 = require("./post-video-storage.service");
const posts_service_1 = require("./posts.service");
const publisherFields = {
    publisherType: joi_1.default.string().valid('user', 'company').default('user'),
    publisherId: joi_1.default.when('publisherType', {
        is: 'company',
        then: joi_1.default.number().integer().positive().required(),
        otherwise: joi_1.default.any().strip(),
    }),
};
const createPostSchema = joi_1.default.object({
    ...publisherFields,
    body: joi_1.default.string().trim().max(2000).allow('', null).optional(),
    linkedJobId: joi_1.default.alternatives()
        .try(joi_1.default.number().integer().positive(), joi_1.default.string().allow(''), joi_1.default.valid(null))
        .optional(),
    allowComments: joi_1.default.boolean().default(true),
});
const updatePostSchema = joi_1.default.object({
    body: joi_1.default.string().trim().max(2000).allow('', null).optional(),
    linkedJobId: joi_1.default.alternatives()
        .try(joi_1.default.number().integer().positive(), joi_1.default.string().allow(''), joi_1.default.valid(null))
        .optional(),
    allowComments: joi_1.default.boolean().optional(),
    removeImage: joi_1.default.boolean().optional(),
    removeMedia: joi_1.default.boolean().optional(),
});
const videoMediaSchema = joi_1.default.object({
    fileName: joi_1.default.string().trim().max(255).required(),
    contentType: joi_1.default.string().trim().max(100).required(),
    fileSizeBytes: joi_1.default.number()
        .integer()
        .positive()
        .max(post_video_storage_service_1.POST_VIDEO_MAX_BYTES)
        .optional(),
    durationSeconds: joi_1.default.number().positive().optional(),
}).required();
const createVideoPostSchema = joi_1.default.object({
    ...publisherFields,
    body: joi_1.default.string().trim().max(2000).allow('', null).optional(),
    linkedJobId: joi_1.default.alternatives()
        .try(joi_1.default.number().integer().positive(), joi_1.default.string().allow(''), joi_1.default.valid(null))
        .optional(),
    allowComments: joi_1.default.boolean().default(true),
    media: videoMediaSchema,
});
const replaceVideoSchema = joi_1.default.object({ media: videoMediaSchema });
const completeVideoUploadSchema = joi_1.default.object({
    uploadId: joi_1.default.string().guid({ version: 'uuidv4' }).required(),
});
const feedQuerySchema = joi_1.default.object({
    cursor: joi_1.default.string().optional(),
    limit: joi_1.default.number().integer().min(1).max(30).default(10),
    publisherType: joi_1.default.string().valid('user', 'company').optional(),
    publisherId: joi_1.default.number().integer().positive().optional(),
}).and('publisherType', 'publisherId');
const commentSchema = joi_1.default.object({
    text: joi_1.default.string().trim().min(1).max(500).required(),
});
const commentsQuerySchema = joi_1.default.object({
    cursor: joi_1.default.string().optional(),
    limit: joi_1.default.number().integer().min(1).max(50).default(20),
});
const reportSchema = joi_1.default.object({
    reason: joi_1.default.string()
        .trim()
        .valid('spam', 'harassment', 'misleading', 'inappropriate', 'other')
        .required(),
    details: joi_1.default.string().trim().max(1000).allow('', null).optional(),
});
const imageInterceptor = (0, platform_express_1.FileInterceptor)(post_storage_service_1.POST_IMAGE_FIELD, {
    limits: { fileSize: post_storage_service_1.POST_IMAGE_MAX_BYTES },
    fileFilter: (_req, file, callback) => {
        if (!(0, post_storage_service_1.isAllowedPostImageMetadata)(file.mimetype, file.originalname)) {
            callback(new common_1.BadRequestException('Post image must be JPEG, PNG, WebP, HEIC, or HEIF'), false);
            return;
        }
        callback(null, true);
    },
});
const videoInterceptor = (0, platform_express_1.FileInterceptor)(post_video_storage_service_1.POST_VIDEO_FILE_FIELD, {
    storage: (0, multer_1.diskStorage)({
        destination: (_req, _file, callback) => {
            const uploadDir = (0, post_video_storage_service_1.getPostVideoTmpDir)();
            (0, post_video_storage_service_1.ensurePostVideoDirectory)(uploadDir);
            callback(null, uploadDir);
        },
        filename: (_req, file, callback) => {
            const extension = (0, path_1.extname)(file.originalname || '').toLowerCase() || '.mp4';
            callback(null, `${Date.now()}-${(0, crypto_1.randomUUID)()}${extension}`);
        },
    }),
    limits: { fileSize: post_video_storage_service_1.POST_VIDEO_MAX_BYTES },
    fileFilter: (_req, file, callback) => {
        if (!(0, post_video_storage_service_1.isAllowedPostVideoMimeType)(file.mimetype) ||
            !(0, post_video_storage_service_1.isAllowedPostVideoFileName)(file.originalname)) {
            callback(new common_1.BadRequestException('Use an MP4, MOV, or M4V video'), false);
            return;
        }
        callback(null, true);
    },
});
let PostsController = class PostsController {
    constructor(postsService) {
        this.postsService = postsService;
    }
    getFeed(query, req) {
        return this.postsService.getFeed(query, req.user.id);
    }
    createVideoUpload(body, req) {
        return this.postsService.createVideoUpload(body, req.user.id);
    }
    replaceVideoUpload(id, body, req) {
        return this.postsService.createVideoReplacement(id, body.media, req.user.id);
    }
    uploadVideo(id, uploadId, video, req) {
        if (!uploadId)
            throw new common_1.BadRequestException('uploadId is required');
        return this.postsService.uploadVideo(id, req.user.id, uploadId, video);
    }
    completeVideoUpload(id, body, req) {
        return this.postsService.completeVideoUpload(id, req.user.id, body.uploadId);
    }
    getPost(id, req) {
        return this.postsService.getPost(id, req.user.id);
    }
    create(body, image, req) {
        return this.postsService.createPost(body, image, req.user.id);
    }
    update(id, body, image, req) {
        return this.postsService.updatePost(id, body, image, req.user.id);
    }
    delete(id, req) {
        return this.postsService.deletePost(id, req.user.id);
    }
    like(id, req) {
        return this.postsService.like(id, req.user.id);
    }
    unlike(id, req) {
        return this.postsService.unlike(id, req.user.id);
    }
    save(id, req) {
        return this.postsService.save(id, req.user.id);
    }
    unsave(id, req) {
        return this.postsService.unsave(id, req.user.id);
    }
    share(id, req) {
        return this.postsService.share(id, req.user.id);
    }
    getComments(id, query, req) {
        return this.postsService.getComments(id, req.user.id, query.cursor, query.limit);
    }
    addComment(id, body, req) {
        return this.postsService.addComment(id, req.user.id, body.text);
    }
    report(id, body, req) {
        return this.postsService.report(id, req.user.id, body.reason, body.details);
    }
};
exports.PostsController = PostsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)(new joi_validation_pipe_1.JoiValidationPipe(feedQuerySchema))),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "getFeed", null);
__decorate([
    (0, common_1.Post)('video-uploads'),
    __param(0, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(createVideoPostSchema))),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "createVideoUpload", null);
__decorate([
    (0, common_1.Post)(':id/video-uploads'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(replaceVideoSchema))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "replaceVideoUpload", null);
__decorate([
    (0, common_1.Post)(':id/video-upload'),
    (0, common_1.UseInterceptors)(videoInterceptor),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)('uploadId')),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, Object, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "uploadVideo", null);
__decorate([
    (0, common_1.Post)(':id/complete-video-upload'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(completeVideoUploadSchema))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "completeVideoUpload", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "getPost", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseInterceptors)(imageInterceptor),
    __param(0, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(createPostSchema))),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseInterceptors)(imageInterceptor),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(updatePostSchema))),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)(':id/like'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "like", null);
__decorate([
    (0, common_1.Delete)(':id/like'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "unlike", null);
__decorate([
    (0, common_1.Post)(':id/save'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "save", null);
__decorate([
    (0, common_1.Delete)(':id/save'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "unsave", null);
__decorate([
    (0, common_1.Post)(':id/share'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "share", null);
__decorate([
    (0, common_1.Get)(':id/comments'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)(new joi_validation_pipe_1.JoiValidationPipe(commentsQuerySchema))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "getComments", null);
__decorate([
    (0, common_1.Post)(':id/comments'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(commentSchema))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "addComment", null);
__decorate([
    (0, common_1.Post)(':id/report'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(reportSchema))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "report", null);
exports.PostsController = PostsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('posts'),
    __metadata("design:paramtypes", [posts_service_1.PostsService])
], PostsController);
//# sourceMappingURL=posts.controller.js.map