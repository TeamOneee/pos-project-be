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
import { ApiError } from './api-error';

export interface ErrorBody {
  success: false;
  statusCode: number;
  path: string;
  message: string;
  errors?: { field?: string; message: string }[];
  timestamp: string;
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

    const { status, body } = this.mapException(exception, request);

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
    request: Request,
  ): { status: number; body: ErrorBody } {
    const path = request.originalUrl ?? request.url;
    const timestamp = new Date().toISOString();

    if (exception instanceof ApiError) {
      return {
        status: exception.statusCode,
        body: {
          success: false,
          statusCode: exception.statusCode,
          path,
          message: exception.message,
          errors: this.toErrors(exception.details),
          timestamp,
        },
      };
    }

    if (exception instanceof ThrottlerException) {
      return {
        status: HttpStatus.TOO_MANY_REQUESTS,
        body: {
          success: false,
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          path,
          message: 'Terlalu banyak permintaan',
          timestamp,
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const message =
        typeof raw === 'string'
          ? raw
          : this.messageFromObject(raw);
      const errors =
        typeof raw === 'string'
          ? undefined
          : this.errorsFromResponse(raw);
      return {
        status,
        body: {
          success: false,
          statusCode: status,
          path,
          message,
          errors,
          timestamp,
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        path,
        message: 'Terjadi kesalahan internal',
        timestamp,
      },
    };
  }

  private toErrors(details?: ApiError['details']): ErrorBody['errors'] {
    if (!details || details.length === 0) {
      return undefined;
    }
    return details.map((detail) => ({
      field: detail.field,
      message: detail.reason ?? 'Nilai tidak valid.',
    }));
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

  private errorsFromResponse(response: object): ErrorBody['errors'] | undefined {
    if (!('message' in response)) {
      return undefined;
    }
    const message = response.message;
    if (!Array.isArray(message)) {
      return undefined;
    }
    return message.map((item) => this.toError(item)).slice(0, 10);
  }

  private toError(item: unknown): { field?: string; message: string } {
    if (typeof item !== 'object' || item === null) {
      return { message: this.stringify(item) };
    }
    const record = item as Record<string, unknown>;
    const property =
      typeof record['property'] === 'string' ? record['property'] : undefined;
    const constraints = record['constraints'];
    let message: string | undefined;
    if (typeof constraints === 'object' && constraints !== null) {
      message = Object.values(constraints)
        .map((value) => this.stringify(value))
        .join(', ');
    }
    return property
      ? { field: property, message: message ?? 'Nilai tidak valid.' }
      : { message: message ?? 'Nilai tidak valid.' };
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
}
