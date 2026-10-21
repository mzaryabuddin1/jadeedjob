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
exports.ConversationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const joi_1 = __importDefault(require("joi"));
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const joi_validation_pipe_1 = require("../common/pipes/joi-validation.pipe");
const conversations_service_1 = require("./conversations.service");
const messages_service_1 = require("./messages.service");
const id = () => joi_1.default.number().integer().positive();
const openSchema = joi_1.default.object({
    type: joi_1.default.string().valid('direct', 'job').required(),
    userId: joi_1.default.when('type', { is: 'direct', then: id().required(), otherwise: id() }),
    jobId: joi_1.default.when('type', { is: 'job', then: id().required(), otherwise: joi_1.default.forbidden() }),
}).messages({
    'any.required': 'Send type "direct" with userId, or type "job" with jobId',
    'any.unknown': 'Send type "direct" with userId, or type "job" with jobId',
});
const sendSchema = joi_1.default.object({
    content: joi_1.default.string().allow(''),
    mediaUrl: joi_1.default.string().max(2000),
    messageType: joi_1.default.string().valid('text', 'image', 'video', 'audio', 'file'),
    clientMsgId: joi_1.default.string().max(64),
});
const readSchema = joi_1.default.object({ messageId: joi_1.default.number().integer().positive() });
const muteSchema = joi_1.default.object({
    muted: joi_1.default.boolean().required(),
    hours: joi_1.default.number().integer().min(1).max(24 * 365),
});
const cursor = () => (t, k, d) => {
    (0, swagger_1.ApiQuery)({ name: 'before', required: false, description: 'older than this message id (`nextCursor` of the previous page)' })(t, k, d);
    (0, swagger_1.ApiQuery)({ name: 'after', required: false, description: 'newer than this message id, oldest first (catch up after being offline)' })(t, k, d);
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, example: 30, description: 'max 100' })(t, k, d);
};
let ConversationsController = class ConversationsController {
    constructor(conversations, messages) {
        this.conversations = conversations;
        this.messages = messages;
    }
    open(body, req) {
        return this.conversations.open(req.user.id, body);
    }
    list(page, limit, req) {
        return this.conversations.list(req.user.id, {
            page: Number(page) || undefined,
            limit: Number(limit) || undefined,
        });
    }
    unread(req) {
        return this.conversations.unreadTotal(req.user.id);
    }
    blocks(req) {
        return this.conversations.listBlocks(req.user.id);
    }
    block(userId, req) {
        return this.conversations.block(req.user.id, userId);
    }
    unblock(userId, req) {
        return this.conversations.unblock(req.user.id, userId);
    }
    get(id, req) {
        return this.conversations.get(req.user.id, id);
    }
    listMessages(id, before, after, limit, req) {
        return this.messages.list(req.user.id, id, {
            before: Number(before) || undefined,
            after: Number(after) || undefined,
            limit: Number(limit) || undefined,
        });
    }
    send(id, body, req) {
        return this.messages.send(req.user.id, id, body);
    }
    read(id, body, req) {
        return this.conversations.markRead(req.user.id, id, body.messageId);
    }
    mute(id, body, req) {
        return this.conversations.mute(req.user.id, id, body.muted, body.hours);
    }
    remove(id, req) {
        return this.messages.remove(req.user.id, id);
    }
};
exports.ConversationsController = ConversationsController;
__decorate([
    (0, common_1.Post)('conversations'),
    (0, swagger_1.ApiOperation)({
        summary: 'Open a chat (get or create)',
        description: [
            'Idempotent: opening the same chat twice returns the same conversation.',
            '- **direct**: `{type:"direct", userId}` - a DM to any user (not yourself, not someone who blocked you / you blocked). New DMs per day are limited.',
            '- **job**: `{type:"job", jobId}` - the "Chat" button on a job. One chat per person per job, with or without applying; you cannot chat on a job that is closed (unless the chat already exists).',
            '  - The **employer side is the job team, not one person**: for a personal job the poster; for a job posted under a page the page owner + every current admin / editor. Any of them can open the same chat and reply; the applicant sees one thread. If the owner removes someone from the page they lose access at once and the owner / rest of the team carry on.',
            '  - The employer side starts a chat with someone who applied: `{type:"job", jobId, userId:<applicantId>}` (403 if that person did not apply). Applicants never send `userId`.',
            'A conversation appears in the inbox (`GET /chat/conversations`) after its first message.',
        ].join('\n'),
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['type'],
            properties: {
                type: { type: 'string', enum: ['direct', 'job'], example: 'job' },
                jobId: { type: 'number', example: 12, description: 'type job' },
                userId: {
                    type: 'number',
                    example: 5,
                    description: 'type direct: the person. type job: only the employer side, the applicant to contact',
                },
            },
        },
    }),
    __param(0, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(openSchema))),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "open", null);
__decorate([
    (0, common_1.Get)('conversations'),
    (0, swagger_1.ApiOperation)({
        summary: 'My inbox',
        description: 'Conversations with at least one message, newest activity first. Each has `other` (the other side: a person, or the page for a page job; `kind` says which), `role` (job chats: `applicant` or `employer`), `job`, `lastMessage`, `unreadCount`, `muted` and `blocked {byMe, byThem}`.',
    }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, example: 20, description: 'max 50' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('unread-count'),
    (0, swagger_1.ApiOperation)({
        summary: 'Unread badge',
        description: 'Unread messages and in how many conversations, across the whole inbox.',
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "unread", null);
__decorate([
    (0, common_1.Get)('blocks'),
    (0, swagger_1.ApiOperation)({ summary: 'People I blocked' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "blocks", null);
__decorate([
    (0, common_1.Post)('blocks/:userId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Block a user',
        description: 'Neither of you can send messages to the other any more (existing history stays readable). Idempotent.',
    }),
    __param(0, (0, common_1.Param)('userId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "block", null);
__decorate([
    (0, common_1.Delete)('blocks/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Unblock a user' }),
    __param(0, (0, common_1.Param)('userId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "unblock", null);
__decorate([
    (0, common_1.Get)('conversations/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'One conversation' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "get", null);
__decorate([
    (0, common_1.Get)('conversations/:id/messages'),
    (0, swagger_1.ApiOperation)({
        summary: 'Messages of a conversation (cursor paging)',
        description: 'Newest page first by default; messages inside a page are oldest -> newest. Scroll up with `before=<nextCursor>` until `hasMore` is false. Use `after=<lastSeenId>` to fetch what you missed while offline. Deleted messages stay as `deleted: true` with no content.',
    }),
    cursor(),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('before')),
    __param(2, (0, common_1.Query)('after')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String, String, Object]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "listMessages", null);
__decorate([
    (0, common_1.Post)('conversations/:id/messages'),
    (0, swagger_1.ApiOperation)({
        summary: 'Send a message (REST fallback of the socket event)',
        description: [
            'Text: `{content}` (max 1000). Media: upload with `POST /files/upload`, then `{messageType:"image"|"video"|"audio"|"file", mediaUrl, content?}`.',
            'Send a unique `clientMsgId` and retry freely: the same id is stored once (`duplicate: true` on a repeat).',
            'Members get it live as the socket event `message:new`; offline members get one merged push.',
        ].join('\n'),
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                content: { type: 'string', example: 'Is the job still open?' },
                mediaUrl: { type: 'string' },
                messageType: { type: 'string', enum: ['text', 'image', 'video', 'audio', 'file'], default: 'text' },
                clientMsgId: { type: 'string', example: 'a1b2c3' },
            },
        },
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(sendSchema))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "send", null);
__decorate([
    (0, common_1.Post)('conversations/:id/read'),
    (0, swagger_1.ApiOperation)({
        summary: 'Mark as read',
        description: 'Moves my read position up to `messageId` (default: the latest). It never moves back. The other members see `conversation:read` live.',
    }),
    (0, swagger_1.ApiBody)({ schema: { type: 'object', properties: { messageId: { type: 'number' } } } }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(readSchema))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "read", null);
__decorate([
    (0, common_1.Patch)('conversations/:id/mute'),
    (0, swagger_1.ApiOperation)({
        summary: 'Mute / unmute push notifications of a conversation',
        description: '`{muted:true}` mutes until unmuted, `{muted:true, hours:8}` for 8 hours, `{muted:false}` unmutes. Messages still arrive.',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['muted'],
            properties: { muted: { type: 'boolean' }, hours: { type: 'number', example: 8 } },
        },
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)(new joi_validation_pipe_1.JoiValidationPipe(muteSchema))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "mute", null);
__decorate([
    (0, common_1.Delete)('messages/:id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Delete my message',
        description: 'Only the sender. The message stays in the chat as a deleted placeholder; members get `message:deleted` live.',
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ConversationsController.prototype, "remove", null);
exports.ConversationsController = ConversationsController = __decorate([
    (0, swagger_1.ApiTags)('Chat'),
    (0, swagger_1.ApiBearerAuth)('JWT'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, throttler_1.Throttle)({ default: { limit: 300, ttl: 60000 } }),
    (0, common_1.Controller)('chat'),
    __metadata("design:paramtypes", [conversations_service_1.ConversationsService,
        messages_service_1.MessagesService])
], ConversationsController);
//# sourceMappingURL=conversations.controller.js.map