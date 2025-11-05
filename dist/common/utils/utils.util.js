"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toSentenceCase = toSentenceCase;
function toSentenceCase(str) {
    if (!str)
        return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
//# sourceMappingURL=utils.util.js.map