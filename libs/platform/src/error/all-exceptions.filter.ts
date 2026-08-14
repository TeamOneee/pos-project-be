import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { ClsService } from 'nestjs-cls';
import { ApiError, ApiErrorDetail } from './api-error';
import { ErrorCode } from './error-code';

interface ErrorBody {
  code: ErrorCode;
  message: string;
  correlation_id: string;
  details?: ApiErrorDetail[];
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly cls: ClsService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId = this.resolveCorrelationId(request);
    response.setHeader('X-Correlation-Id', correlationId);

    const { status, body } = this.mapException(exception, correlationId);

    if (status >= 500) {
      this.logger.error(
        `[${correlationId}] ${request.method} ${request.originalUrl} -> ${status}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json(body);
  }

  private resolveCorrelationId(request: Request): string {
    const stored = this.cls.get<string>('correlationId');
    if (stored) {
      return stored;
    }
    const header = request.headers['x-correlation-id'];
    if (typeof header === 'string' && header.trim().length > 0) {
      return header.trim().slice(0, 64);
    }
    return `c-${randomUUID().replace(/-/g, '').slice(0, 8)}`;
  }

  private mapException(
    exception: unknown,
    correlationId: string,
  ): { status: number; body: ErrorBody } {
    if (exception instanceof ApiError) {
      return {
        status: exception.statusCode,
        body: {
          code: exception.code,
          message: exception.message,
          correlation_id: correlationId,
          details: exception.details,
        },
      };
    }

    if (exception instanceof ThrottlerException) {
      return {
        status: HttpStatus.TOO_MANY_REQUESTS,
        body: {
          code: ErrorCode.RATE_LIMITED,
          message: 'Terlalu banyak permintaan.',
          correlation_id: correlationId,
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : this.messageFromObject(response);
      const details =
        typeof response === 'string'
          ? undefined
          : this.detailsFromResponse(response);
      return {
        status,
        body: {
          code: this.codeForHttpStatus(status),
          message,
          correlation_id: correlationId,
          details,
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Terjadi kesalahan internal.',
        correlation_id: correlationId,
      },
    };
  }

  private messageFromObject(response: object): string {
    if (!('message' in response)) {
      return 'Terjadi kesalahan.';
    }
    const message = response.message;
    if (typeof message === 'string') {
      return message;
    }
    if (Array.isArray(message)) {
      return 'Input tidak valid.';
    }
    return 'Terjadi kesalahan.';
  }

  private detailsFromResponse(response: object): ApiErrorDetail[] | undefined {
    if (!('message' in response)) {
      return undefined;
    }
    const message = response.message;
    if (!Array.isArray(message)) {
      return undefined;
    }
    return message.map((item) => this.toDetail(item)).slice(0, 10);
  }

  private toDetail(item: unknown): ApiErrorDetail {
    if (typeof item !== 'object' || item === null) {
      return { reason: this.stringify(item) };
    }
    const record = item as Record<string, unknown>;
    const property =
      typeof record['property'] === 'string' ? record['property'] : undefined;
    const constraints = record['constraints'];
    let reason: string | undefined;
    if (typeof constraints === 'object' && constraints !== null) {
      reason = Object.values(constraints)
        .map((value) => this.stringify(value))
        .join(', ');
    }
    return property
      ? { field: property, reason: reason ?? 'Nilai tidak valid.' }
      : { reason: reason ?? 'Nilai tidak valid.' };
  }

  private stringify(value: unknown): string {
    if (value === undefined) {
      return 'undefined';
    }
    if (typeof value === 'symbol') {
      return value.toString();
    }
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return JSON.stringify(value) ?? '';
  }

  private codeForHttpStatus(status: number): ErrorCode {
    const byStatus: Record<number, ErrorCode> = {
      [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_ERROR,
      [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHENTICATED,
      [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
      [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
      [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RATE_LIMITED,
      [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCode.DEPENDENCY_UNAVAILABLE,
    };
    return byStatus[status] ?? ErrorCode.INTERNAL_ERROR;
  }
}
