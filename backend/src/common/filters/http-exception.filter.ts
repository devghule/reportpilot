import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  // This filter previously swallowed every exception app-wide with no trace
  // at all — logging server-side (never sent to the client) is what makes
  // production errors debuggable. Never log the request body: it can carry
  // business data, and some DTOs are large (e.g. AI report data).
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const context = `${request.method} ${request.originalUrl}`;

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Something went wrong. Please try again.';
    let error = 'INTERNAL_SERVER_ERROR';

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

    // 4xx are expected client-input outcomes (validation, not found, auth) —
    // logging those as `error` would drown real server-side failures in
    // noise. Only 5xx (and non-HTTP exceptions, which are always a bug)
    // warrant error level with a full stack trace.
    const isServerError = statusCode >= 500;
    const stack = exception instanceof Error ? exception.stack : undefined;
    if (isServerError) {
      this.logger.error(`[${context}] ${message}`, stack);
    } else {
      this.logger.warn(`[${context}] ${statusCode} ${message}`);
    }

    response.status(statusCode).json({
      statusCode,
      message,
      error,
    });
  }
}
