import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Something went wrong. Please try again.';
    let error = 'INTERNAL_SERVER_ERROR';

    // TEMPORARY DIAGNOSTIC LOGGING — this filter previously swallowed every
    // exception app-wide with no trace. Logging the raw exception here is
    // the only way Render's logs will ever show what actually failed.
    if (exception instanceof Error) {
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
    } else {
      this.logger.error(`Unhandled exception (non-Error): ${JSON.stringify(exception)}`);
    }

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = Array.isArray(resObj.message)
          ? (resObj.message as string[]).join(', ')
          : ((resObj.message as string) ?? message);
      }
      error = HttpStatus[statusCode] ?? 'ERROR';
    }

    response.status(statusCode).json({
      statusCode,
      message,
      error,
    });
  }
}
