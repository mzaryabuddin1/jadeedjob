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
var PostEngagementNotifier_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostEngagementNotifier = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const post_entity_1 = require("./entities/post.entity");
const post_engagement_entities_1 = require("./entities/post-engagement.entities");
const user_entity_1 = require("../users/entities/user.entity");
const notification_queue_service_1 = require("../notification/notification-queue.service");
const notification_service_1 = require("../notification/notification.service");
const follow_service_1 = require("../follow/follow.service");
const num = (v, fallback) => v !== undefined && v !== '' && !Number.isNaN(Number(v))
    ? Number(v)
    : fallback;
let PostEngagementNotifier = PostEngagementNotifier_1 = class PostEngagementNotifier {
    constructor(queue, notifications, postRepo, likeRepo, commentRepo, userRepo) {
        this.queue = queue;
        this.notifications = notifications;
        this.postRepo = postRepo;
        this.likeRepo = likeRepo;
        this.commentRepo = commentRepo;
        this.userRepo = userRepo;
        this.logger = new common_1.Logger(PostEngagementNotifier_1.name);
    }
    onModuleInit() {
        this.queue.register('post_like', {
            delaySeconds: num(process.env.POST_LIKE_NOTIFY_DELAY_SECONDS, 45),
            minGapSeconds: num(process.env.POST_LIKE_NOTIFY_MIN_GAP_SECONDS, 180),
            handler: (items) => this.flushLikes(items),
        });
        this.queue.register('post_comment', {
            delaySeconds: num(process.env.POST_COMMENT_NOTIFY_DELAY_SECONDS, 20),
            minGapSeconds: num(process.env.POST_COMMENT_NOTIFY_MIN_GAP_SECONDS, 60),
            handler: (items) => this.flushComments(items),
        });
    }
    path(postId) {
        return (process.env.NOTIFICATION_POST_PATH || '/post/{id}').replace('{id}', String(postId));
    }
    async onLike(post, actorId) {
        if (actorId === post.authorId)
            return;
        await this.safeEnqueue({
            type: 'post_like',
            groupKey: `post_like:${post.id}`,
            recipientId: post.authorId,
            payload: { postId: post.id, actorId },
        });
    }
    async onComment(post, actorId, comment, parent) {
        if (actorId !== post.authorId) {
            await this.safeEnqueue({
                type: 'post_comment',
                groupKey: `post_comment:${post.id}`,
                recipientId: post.authorId,
                payload: { postId: post.id, actorId, commentId: comment.id },
            });
        }
        if (parent &&
            parent.userId !== actorId &&
            parent.userId !== post.authorId) {
            await this.safeEnqueue({
                type: 'post_comment',
                groupKey: `comment_reply:${parent.id}`,
                recipientId: parent.userId,
                payload: {
                    postId: post.id,
                    actorId,
                    commentId: comment.id,
                    reply: true,
                },
            });
        }
    }
    async safeEnqueue(item) {
        try {
            await this.queue.enqueue(item);
        }
        catch (err) {
            this.logger.error(`Could not queue ${item.type}: ${err?.message}`);
        }
    }
    async names(ids) {
        const users = ids.length
            ? await this.userRepo.find({
                where: { id: (0, typeorm_2.In)([...new Set(ids)]) },
                select: ['id', 'firstName', 'lastName'],
            })
            : [];
        return new Map(users.map((u) => [u.id, (0, follow_service_1.fullName)(u) || 'Someone']));
    }
    async flushLikes(items) {
        const postId = items[0].payload.postId;
        const post = await this.postRepo.findOne({
            where: { id: postId, deletedAt: (0, typeorm_2.IsNull)() },
        });
        if (!post)
            return { status: 'skipped', note: 'post deleted' };
        const actorIds = [
            ...new Set(items.map((i) => i.payload.actorId)),
        ];
        const still = await this.likeRepo.find({
            where: { postId, userId: (0, typeorm_2.In)(actorIds) },
            order: { id: 'DESC' },
        });
        if (!still.length)
            return { status: 'skipped', note: 'all likes were taken back' };
        const names = await this.names(still.map((l) => l.userId));
        const first = names.get(still[0].userId);
        const others = still.length - 1;
        const noun = post.kind === 'reel' ? 'reel' : 'post';
        const body = others === 0
            ? `${first} liked your ${noun}`
            : `${first} and ${others} other${others > 1 ? 's' : ''} liked your ${noun}`;
        const res = await this.notifications.notifyUser(post.authorId, {
            title: 'New likes',
            body,
            data: {
                type: 'post_like',
                postId,
                kind: post.kind,
                count: still.length,
                totalLikes: post.likesCount,
                path: this.path(postId),
            },
        });
        return {
            status: 'sent',
            note: `"${body}" | push ${res.push}${res.email ? ' + email' : ''}`,
        };
    }
    async flushComments(items) {
        const postId = items[0].payload.postId;
        const reply = !!items[0].payload.reply;
        const post = await this.postRepo.findOne({
            where: { id: postId, deletedAt: (0, typeorm_2.IsNull)() },
        });
        if (!post)
            return { status: 'skipped', note: 'post deleted' };
        const ids = items.map((i) => i.payload.commentId);
        const live = await this.commentRepo.find({
            where: { id: (0, typeorm_2.In)(ids), deletedAt: (0, typeorm_2.IsNull)() },
            order: { id: 'DESC' },
        });
        if (!live.length)
            return { status: 'skipped', note: 'comments were deleted' };
        const names = await this.names(live.map((c) => c.userId));
        const noun = post.kind === 'reel' ? 'reel' : 'post';
        let body;
        if (live.length === 1) {
            const snippet = live[0].text.length > 80
                ? `${live[0].text.slice(0, 77)}...`
                : live[0].text;
            body = reply
                ? `${names.get(live[0].userId)} replied: "${snippet}"`
                : `${names.get(live[0].userId)} commented: "${snippet}"`;
        }
        else {
            body = reply
                ? `${live.length} new replies to your comment`
                : `${live.length} new comments on your ${noun}`;
        }
        const res = await this.notifications.notifyUser(items[0].recipientId, {
            title: reply ? 'New replies' : 'New comments',
            body,
            data: {
                type: reply ? 'comment_reply' : 'post_comment',
                postId,
                kind: post.kind,
                count: live.length,
                commentId: live[0].id,
                path: this.path(postId),
            },
        });
        return {
            status: 'sent',
            note: `"${body}" | push ${res.push}${res.email ? ' + email' : ''}`,
        };
    }
};
exports.PostEngagementNotifier = PostEngagementNotifier;
exports.PostEngagementNotifier = PostEngagementNotifier = PostEngagementNotifier_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(post_entity_1.Post)),
    __param(3, (0, typeorm_1.InjectRepository)(post_engagement_entities_1.PostLike)),
    __param(4, (0, typeorm_1.InjectRepository)(post_engagement_entities_1.PostComment)),
    __param(5, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [notification_queue_service_1.NotificationQueueService,
        notification_service_1.NotificationService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], PostEngagementNotifier);
//# sourceMappingURL=post-engagement-notifier.js.map