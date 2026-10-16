"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_NOTIFICATION_SETTINGS = exports.NOTIFICATION_CHANNELS = void 0;
exports.resolveNotificationSettings = resolveNotificationSettings;
exports.NOTIFICATION_CHANNELS = ['push', 'email'];
exports.DEFAULT_NOTIFICATION_SETTINGS = {
    push: true,
    email: false,
};
function resolveNotificationSettings(stored) {
    return {
        push: typeof stored?.push === 'boolean'
            ? stored.push
            : exports.DEFAULT_NOTIFICATION_SETTINGS.push,
        email: typeof stored?.email === 'boolean'
            ? stored.email
            : exports.DEFAULT_NOTIFICATION_SETTINGS.email,
    };
}
//# sourceMappingURL=notification-settings.js.map