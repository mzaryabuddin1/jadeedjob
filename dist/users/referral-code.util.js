"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReferralCode = generateReferralCode;
const crypto_1 = require("crypto");
const REFERRAL_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateReferralCode() {
    const bytes = (0, crypto_1.randomBytes)(8);
    let code = 'JJ';
    for (let i = 0; i < 8; i += 1) {
        code += REFERRAL_ALPHABET[bytes[i] % REFERRAL_ALPHABET.length];
    }
    return code;
}
//# sourceMappingURL=referral-code.util.js.map