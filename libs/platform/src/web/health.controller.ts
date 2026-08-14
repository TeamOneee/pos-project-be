import { Controller, Get, Logger } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaWriteService } from '../prisma/prisma-write.service';
import { ApiError } from '../error/api-error';
import { Public } from '../security/public.decorator';

interface HealthResponse {
  status: 'ok';
  database: 'ok';
  worker_backlog: {
    outbox_pending: number;
    job_pending: number;
  };
}

@Controller('health')
@Public()
@SkipThrottle()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prismaWrite: PrismaWriteService) {}

  @Get()
  async check(): Promise<HealthResponse> {
    try {
      await this.prismaWrite.$queryRaw`SELECT 1`;
    } catch (error) {
      this.logger.error(
        'Health check gagal: database primary tidak sehat.',
        error,
      );
      throw ApiError.dependencyUnavailable('Database primary tidak sehat.');
    }

    const [outboxPending, jobPending] = await Promise.all([
      this.prismaWrite.outboxEvent.count({ where: { status: 'PENDING' } }),
      this.prismaWrite.jobRecord.count({ where: { state: 'PENDING' } }),
    ]);

    return {
      status: 'ok',
      database: 'ok',
      worker_backlog: {
        outbox_pending: outboxPending,
        job_pending: jobPending,
      },
    };
  }
}
