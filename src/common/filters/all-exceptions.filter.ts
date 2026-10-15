import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] | Record<string, any> =
      'Internal server error';
    let error = 'Internal Server Error';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
        error = exception.name;
      } else if (body && typeof body === 'object') {
        const obj = body as Record<string, any>;
        message = obj.message ?? obj.error ?? body;
        error = obj.error ?? exception.name;
        if (obj.errors) details = obj.errors;
      }
    } else if (exception && typeof exception === 'object') {
      const err = exception as any;
      // TypeORM QueryFailedError, driver errors, etc.
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
      // Drop empty detail keys
      Object.keys(details).forEach((k) => {
        if (details[k] == null) delete details[k];
      });
      if (!Object.keys(details).length) details = undefined;
    } else {
      message = String(exception);
    }

    this.logger.error(
      `${request.method} ${request.url} → ${status}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(status).json({
      statusCode: status,
      error,
      message,
      ...(details ? { details } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
