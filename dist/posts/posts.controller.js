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
const joi_1 = __importDefault(require("joi"));
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const post_storage_service_1 = require("./post-storage.service");
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
        .try(joi_1.default.number().integer().positive(), joi_1.default.string().allow(''))
        .optional(),
    allowComments: joi_1.default.boolean().default(true),
});
const updatePostSchema = joi_1.default.object({
    body: joi_1.default.string().trim().max(2000).allow('', null).optional(),
    linkedJobId: joi_1.default.alternatives()
        .try(joi_1.default.number().integer().positive(), joi_1.default.string().allow(''))
        .optional(),
    allowComments: joi_1.default.boolean().optional(),
    removeImage: joi_1.default.boolean().optional(),
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
const reportSchema = joi_1.default.object({
    reason: joi_1.default.string()
        .trim()
        .valid('spam', 'harassment', 'misleading', 'inappropriate', 'other')
        .default('other'),
    details: joi_1.default.string().trim().max(1000).allow('', null).optional(),
});
const imageInterceptor = (0, platform_express_1.FileInterceptor)(post_storage_service_1.POST_IMAGE_FIELD, {
    limits: { fileSize: post_storage_service_1.POST_IMAGE_MAX_BYTES },
    fileFilter: (_req, file, callback) => {
        if (!(0, post_storage_service_1.isAllowedPostImageMetadata)(file.mimetype, file.originalname)) {
            callback(new common_1.BadRequestException('Post image must be JPEG, PNG, WebP, or HEIC'), false);
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
    getComments(id, cursor, limit, req) {
        return this.postsService.getComments(id, req.user.id, cursor, Number(limit));
    }
    addComment(id, text, req) {
        return this.postsService.addComment(id, req.user.id, text);
    }
    report(id, body, req) {
        return this.postsService.report(id, req.user.id, body.reason, body.details);
    }
};
exports.PostsController = PostsController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(feedQuerySchema)),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "getFeed", null);
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
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(createPostSchema)),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseInterceptors)(imageInterceptor),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(updatePostSchema)),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
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
    __param(1, (0, common_1.Query)('cursor')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, Number, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "getComments", null);
__decorate([
    (0, common_1.Post)(':id/comments'),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(commentSchema)),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)('text')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, Object]),
    __metadata("design:returntype", void 0)
], PostsController.prototype, "addComment", null);
__decorate([
    (0, common_1.Post)(':id/report'),
    (0, common_1.UsePipes)(new joi_validation_pipe_1.JoiValidationPipe(reportSchema)),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
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