import { HttpException, HttpStatus } from '@nestjs/common';

export type ApiErrorDetails = Record<string, unknown> | unknown[];

export class ApiException extends HttpException {
  constructor(
    status: HttpStatus,
    code: string,
    message: string,
    details?: ApiErrorDetails,
  ) {
    super(
      {
        statusCode: status,
        error: HttpStatus[status] || 'Error',
        code,
        message,
        ...(details === undefined ? {} : { details }),
      },
      status,
    );
  }
}
