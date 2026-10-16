"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirebaseService = void 0;
const common_1 = require("@nestjs/common");
const admin = __importStar(require("firebase-admin"));
let FirebaseService = class FirebaseService {
    constructor(firebaseApp) {
        this.firebaseApp = firebaseApp;
    }
    async sendNotification(tokens, title, body) {
        return this.firebaseApp.messaging().sendEachForMulticast({
            tokens,
            notification: { title, body },
        });
    }
    async sendToTokens(tokens, notification, data = {}) {
        const results = await this.sendDetailed(tokens, notification, data);
        const errors = {};
        for (const r of results) {
            if (r.ok)
                continue;
            const code = r.code || 'unknown';
            errors[code] = errors[code] || { count: 0, hint: r.hint || '' };
            errors[code].count++;
        }
        const success = results.filter((r) => r.ok).length;
        return { success, failure: results.length - success, errors };
    }
    async sendDetailed(tokens, notification, data = {}) {
        const unique = [...new Set(tokens.filter(Boolean))];
        const out = [];
        for (let i = 0; i < unique.length; i += 500) {
            const chunk = unique.slice(i, i + 500);
            const res = await this.firebaseApp.messaging().sendEachForMulticast({
                tokens: chunk,
                notification,
                data,
            });
            res.responses.forEach((r, idx) => {
                out.push(r.success
                    ? { token: chunk[idx], ok: true, messageId: r.messageId }
                    : {
                        token: chunk[idx],
                        ok: false,
                        code: r.error?.code,
                        message: r.error?.message,
                        hint: this.hintForError(r.error?.code),
                    });
            });
        }
        return out;
    }
    getProjectId() {
        const opts = this.firebaseApp.options;
        return opts?.credential?.projectId ?? opts?.projectId;
    }
    hintForError(code) {
        switch (code) {
            case 'messaging/registration-token-not-registered':
                return 'Token is stale: app was uninstalled/reinstalled or token refreshed. Re-login in the app to send a fresh fcmToken.';
            case 'messaging/invalid-registration-token':
            case 'messaging/invalid-argument':
                return 'Token is malformed/truncated, or not an FCM token.';
            case 'messaging/mismatched-credential':
            case 'messaging/sender-id-mismatch':
                return "The app was built with a DIFFERENT Firebase project than this server's service account. Use the same project (google-services.json / service account).";
            case 'messaging/third-party-auth-error':
                return 'iOS: APNs key/certificate is missing or invalid in Firebase console → Cloud Messaging.';
            case 'messaging/quota-exceeded':
                return 'FCM rate limit hit — retry later with backoff.';
            case 'messaging/server-unavailable':
            case 'messaging/internal-error':
                return 'FCM temporary problem — safe to retry.';
            case 'messaging/authentication-error':
            case 'app/invalid-credential':
                return 'Server service account is invalid or lacks the FCM permission.';
            default:
                return '';
        }
    }
    async subscribeTokenToFilters(token, filterIds) {
        const topics = filterIds.map((id) => `filter_${id}`);
        for (const topic of topics) {
            await this.firebaseApp.messaging().subscribeToTopic(token, topic);
        }
    }
    async updateFilterSubscriptions(token, oldFilters, newFilters) {
        const oldSet = new Set(oldFilters || []);
        const newSet = new Set(newFilters || []);
        const toSubscribe = [];
        const toUnsubscribe = [];
        for (const id of newSet) {
            if (!oldSet.has(id)) {
                toSubscribe.push(`filter_${id}`);
            }
        }
        for (const id of oldSet) {
            if (!newSet.has(id)) {
                toUnsubscribe.push(`filter_${id}`);
            }
        }
        if (toSubscribe.length) {
            for (const topic of toSubscribe) {
                await this.firebaseApp.messaging().subscribeToTopic(token, topic);
            }
        }
        if (toUnsubscribe.length) {
            for (const topic of toUnsubscribe) {
                await this.firebaseApp.messaging().unsubscribeFromTopic(token, topic);
            }
        }
    }
    async sendToFilterTopic(filterId, title, body, data) {
        return this.firebaseApp.messaging().send({
            topic: `filter_${filterId}`,
            notification: { title, body },
            data,
        });
    }
    async sendTestToToken(token) {
        return this.firebaseApp.messaging().send({
            token,
            notification: {
                title: '🔥 Test Notification',
                body: 'Your browser is receiving push notifications!',
            },
        });
    }
};
exports.FirebaseService = FirebaseService;
exports.FirebaseService = FirebaseService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('FIREBASE_ADMIN')),
    __metadata("design:paramtypes", [Object])
], FirebaseService);
//# sourceMappingURL=firebase.service.js.map