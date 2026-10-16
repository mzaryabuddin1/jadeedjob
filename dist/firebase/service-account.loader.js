"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadServiceAccount = loadServiceAccount;
const fs_1 = require("fs");
const path_1 = require("path");
function loadServiceAccount() {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
    if (raw) {
        const text = raw.startsWith('{')
            ? raw
            : Buffer.from(raw, 'base64').toString('utf8');
        return JSON.parse(text);
    }
    const configured = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
    const candidates = [
        configured && ((0, path_1.isAbsolute)(configured) ? configured : (0, path_1.resolve)(configured)),
        (0, path_1.join)(__dirname, 'service-account.json'),
        (0, path_1.join)(__dirname, 'jobslootstaging-8fa70d6ad08a.json'),
    ].filter(Boolean);
    const file = candidates.find((f) => (0, fs_1.existsSync)(f));
    if (!file) {
        throw new Error('Firebase service account not found. Set FIREBASE_SERVICE_ACCOUNT_JSON ' +
            '(raw or base64), FIREBASE_SERVICE_ACCOUNT_PATH, or place ' +
            'service-account.json in src/firebase/. Tried: ' +
            candidates.join(', '));
    }
    return JSON.parse((0, fs_1.readFileSync)(file, 'utf8'));
}
//# sourceMappingURL=service-account.loader.js.map