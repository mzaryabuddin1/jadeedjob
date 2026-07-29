"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let ApiExceptionFilter = class ApiExceptionFilter {
    catch(exception, host) {
        const response = host.switchToHttp().getResponse();
        const request = host.switchToHttp().getRequest();
        const status = exception instanceof common_1.HttpException
            ? exception.getStatus()
            : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        const raw = exception instanceof common_1.HttpException
            ? exception.getResponse()
            : { message: 'Internal server error' };
        const body = typeof raw === 'string'
            ? { message: raw }
            : { ...raw };
        const message = body.message || 'Request failed';
        const normalizedMessage = Array.isArray(message)
            ? String(message[0] || 'Request failed')
            : String(message);
        response.status(status).json({
            statusCode: status,
            error: body.error ||
                (status >= 500 ? 'Internal Server Error' : common_1.HttpStatus[status] || 'Error'),
            code: body.code || this.defaultCode(status),
            message: normalizedMessage,
            ...(body.details !== undefined ? { details: body.details } : {}),
            ...(body.errors !== undefined ? { errors: body.errors } : {}),
            path: request.originalUrl,
            timestamp: new Date().toISOString(),
        });
    }
    defaultCode(status) {
        if (status === 400)
            return 'VALIDATION_FAILED';
        if (status === 401)
            return 'AUTH_SESSION_INVALID';
        if (status === 403)
            return 'FORBIDDEN';
        if (status === 404)
            return 'NOT_FOUND';
        if (status === 409)
            return 'CONFLICT';
        if (status === 422)
            return 'BUSINESS_RULE_FAILED';
        if (status === 429)
            return 'RATE_LIMITED';
        return 'INTERNAL_ERROR';
    }
};
exports.ApiExceptionFilter = ApiExceptionFilter;
exports.ApiExceptionFilter = ApiExceptionFilter = __decorate([
    (0, common_1.Catch)()
], ApiExceptionFilter);
//# sourceMappingURL=api-exception.filter.js.map