import { Controller, Get, Logger } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaReadService } from '../prisma/prisma-read.service';
import { PrismaWriteService } from '../prisma/prisma-write.service';
import { ApiError } from '../error/api-error';
import { Public } from '../security/public.decorator';
import { SuccessMessage } from './success-message.decorator';

interface HealthResponse {
  status: 'ok';
  database: {
    primary: 'ok';
    read_replica: 'ok';
  };
  worker_backlog: {
    ai_job_pending: number;
  };
}

@Controller('health')
@Public()
@SkipThrottle()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  @Get()
  @SuccessMessage('Sistem sehat.')
  async check(): Promise<HealthResponse> {
    try {
      await Promise.all([
        this.prismaWrite.$queryRaw`SELECT 1`,
        this.prismaRead.$queryRaw`SELECT 1`,
      ]);
    } catch (error) {
      this.logger.error(
        'Health check gagal: database primary atau replica tidak sehat.',
        error,
      );
      throw ApiError.dependencyUnavailable('Database tidak sehat.');
    }

    const aiJobPending = await this.prismaWrite.aiAnalysisJob.count({
      where: { state: 'PENDING' },
    });

    return {
      status: 'ok',
      database: {
        primary: 'ok',
        read_replica: 'ok',
      },
      worker_backlog: {
        ai_job_pending: aiJobPending,
      },
    };
  }
}
