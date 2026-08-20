import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers['x-correlation-id'];
    const incoming = typeof header === 'string' ? header.trim() : undefined;
    const id =
      incoming && incoming.length > 0 ? incoming.slice(0, 64) : this.generate();

    res.setHeader('X-Correlation-Id', id);

    this.cls.run(() => {
      this.cls.set('correlationId', id);
      next();
    });
  }

  private generate(): string {
    return `c-${randomUUID().replaceAll('-', '').slice(0, 8)}`;
  }
}
