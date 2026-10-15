"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AllExceptionsFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
let AllExceptionsFilter = AllExceptionsFilter_1 = class AllExceptionsFilter {
    constructor() {
        this.logger = new common_1.Logger(AllExceptionsFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let error = 'Internal Server Error';
        let details = undefined;
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const body = exception.getResponse();
            if (typeof body === 'string') {
                message = body;
                error = exception.name;
            }
            else if (body && typeof body === 'object') {
                const obj = body;
                message = obj.message ?? obj.error ?? body;
                error = obj.error ?? exception.name;
                if (obj.errors)
                    details = obj.errors;
            }
        }
        else if (exception && typeof exception === 'object') {
            const err = exception;
            message =
                err.sqlMessage ||
                    err.driverError?.message ||
                    err.message ||
                    String(exception);
            error = err.name || err.code || 'Error';
            details = {
                code: err.code ?? err.driverError?.code,
                errno: err.errno ?? err.driverError?.errno,
                sqlState: err.sqlState ?? err.driverError?.sqlState,
                sql: err.sql,
            };
            Object.keys(details).forEach((k) => {
                if (details[k] == null)
                    delete details[k];
            });
            if (!Object.keys(details).length)
                details = undefined;
        }
        else {
            message = String(exception);
        }
        this.logger.error(`${request.method} ${request.url} → ${status}`, exception instanceof Error ? exception.stack : String(exception));
        response.status(status).json({
            statusCode: status,
            error,
            message,
            ...(details ? { details } : {}),
            path: request.url,
            timestamp: new Date().toISOString(),
        });
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = AllExceptionsFilter_1 = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=all-exceptions.filter.js.map