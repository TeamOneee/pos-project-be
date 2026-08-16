import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { Observable, map } from 'rxjs';
import { SUCCESS_MESSAGE_KEY } from './success-message.decorator';

export interface SuccessResponse<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
}

// membungkus seluruh response http sukses dengan kontrak api yang konsisten.
@Injectable()
export class SuccessResponseInterceptor<T> implements NestInterceptor<
  T,
  SuccessResponse<T> | T
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessResponse<T> | T> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse<Response>();

        // 204 secara sengaja tidak mempunyai body menurut kontrak API §0.
        if (response.statusCode === 204) {
          return data;
        }

        const message =
          this.reflector.getAllAndOverride<string>(SUCCESS_MESSAGE_KEY, [
            context.getHandler(),
            context.getClass(),
          ]) ?? 'Permintaan berhasil.';

        return {
          success: true,
          statusCode: response.statusCode,
          message,
          data,
        };
      }),
    );
  }
}
