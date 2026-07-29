import { HttpException, HttpStatus } from '@nestjs/common';
export type ApiErrorDetails = Record<string, unknown> | unknown[];
export declare class ApiException extends HttpException {
    constructor(status: HttpStatus, code: string, message: string, details?: ApiErrorDetails);
}
