import { Controller, Get, HttpStatus, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthUser, CurrentUser, Roles, SuccessMessage } from '@app/platform';
import { InsightQueryService } from '../application/insight-query.service';
import { InsightTriggerService } from '../application/insight-trigger.service';
import { toInsightOverviewDto, toInsightTriggerDto } from './insight.presenter';
import {
  InsightOverviewDto,
  InsightTriggerDto,
} from './dto/insight-response.dto';

// menyediakan trigger dan hasil insight merchant secara eksklusif untuk owner.
@Controller('insights')
export class InsightController {
  constructor(
    private readonly triggerService: InsightTriggerService,
    private readonly queryService: InsightQueryService,
  ) {}

  @Post('trigger')
  @Roles('OWNER')
  @SuccessMessage('Analisis insight dijadwalkan.')
  async trigger(
    @CurrentUser() actor: AuthUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<InsightTriggerDto> {
    const result = await this.triggerService.trigger(actor);
    response.status(result.created ? HttpStatus.ACCEPTED : HttpStatus.OK);
    return toInsightTriggerDto(result);
  }

  @Get()
  @Roles('OWNER')
  @SuccessMessage('Insight terbaru per tipe berhasil dimuat.')
  async getLatest(@CurrentUser() actor: AuthUser): Promise<InsightOverviewDto> {
    return toInsightOverviewDto(await this.queryService.getLatest(actor));
  }
}
