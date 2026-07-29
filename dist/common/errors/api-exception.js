"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiException = void 0;
const common_1 = require("@nestjs/common");
class ApiException extends common_1.HttpException {
    constructor(status, code, message, details) {
        super({
            statusCode: status,
            error: common_1.HttpStatus[status] || 'Error',
            code,
            message,
            ...(details === undefined ? {} : { details }),
        }, status);
    }
}
exports.ApiException = ApiException;
//# sourceMappingURL=api-exception.js.map