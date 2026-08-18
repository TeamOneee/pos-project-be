import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { httpRequestDuration, httpRequestsTotal } from '../platform.metrics';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const method: string = req.method;
    const route: string = (req.route?.path as string) ?? req.path;

    const end = httpRequestDuration.startTimer({
      method,
      route,
      status_code: '0',
    });

    return next.handle().pipe(
      finalize(() => {
        const statusCode = String(res.statusCode);
        end({ status_code: statusCode });
        httpRequestsTotal.inc({ method, route, status_code: statusCode });
      }),
    );
  }
}
