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
                title: "🔥 Test Notification",
                body: "Your browser is receiving push notifications!",
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