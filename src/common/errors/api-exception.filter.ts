import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };
    const body =
      typeof raw === 'string'
        ? { message: raw }
        : ({ ...(raw as Record<string, unknown>) } as Record<string, unknown>);
    const message = body.message || 'Request failed';
    const normalizedMessage = Array.isArray(message)
      ? String(message[0] || 'Request failed')
      : String(message);

    response.status(status).json({
      statusCode: status,
      error:
        body.error ||
        (status >= 500 ? 'Internal Server Error' : HttpStatus[status] || 'Error'),
      code: body.code || this.defaultCode(status),
      message: normalizedMessage,
      ...(body.details !== undefined ? { details: body.details } : {}),
      ...(body.errors !== undefined ? { errors: body.errors } : {}),
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }

  private defaultCode(status: number) {
    if (status === 400) return 'VALIDATION_FAILED';
    if (status === 401) return 'AUTH_SESSION_INVALID';
    if (status === 403) return 'FORBIDDEN';
    if (status === 404) return 'NOT_FOUND';
    if (status === 409) return 'CONFLICT';
    if (status === 422) return 'BUSINESS_RULE_FAILED';
    if (status === 429) return 'RATE_LIMITED';
    return 'INTERNAL_ERROR';
  }
}
