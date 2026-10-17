"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USERNAME_RULES_TEXT = exports.USERNAME_PATTERN = exports.USERNAME_COOLDOWN_MS = exports.USERNAME_COOLDOWN_DAYS = void 0;
exports.normalizeUsername = normalizeUsername;
exports.generateUniqueUsername = generateUniqueUsername;
const crypto_1 = require("crypto");
exports.USERNAME_COOLDOWN_DAYS = 7;
exports.USERNAME_COOLDOWN_MS = exports.USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
exports.USERNAME_PATTERN = /^(?!.*[._]{2})[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$/;
exports.USERNAME_RULES_TEXT = 'Username must be 3-30 characters: lowercase letters, numbers, "." and "_" (must start and end with a letter or number, no repeated "." or "_")';
function normalizeUsername(raw) {
    return String(raw ?? '')
        .trim()
        .replace(/^@/, '')
        .toLowerCase();
}
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
function randomString(length) {
    const bytes = (0, crypto_1.randomBytes)(length);
    let out = '';
    for (let i = 0; i < length; i++)
        out += ALPHABET[bytes[i] % ALPHABET.length];
    return out;
}
function nameBase(firstName, lastName) {
    const base = `${firstName ?? ''}${lastName ?? ''}`
        .normalize('NFKD')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 20);
    return base || 'user';
}
async function generateUniqueUsername(userRepo, firstName, lastName) {
    const base = nameBase(firstName, lastName);
    for (let attempt = 0; attempt < 10; attempt++) {
        const candidate = `${base}_${randomString(attempt < 5 ? 5 : 8)}`;
        const taken = await userRepo.exist({ where: { username: candidate } });
        if (!taken)
            return candidate;
    }
    return `${base}_${randomString(12)}`;
}
//# sourceMappingURL=username.util.js.map