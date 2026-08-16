// memverifikasi validasi payload query parameter periode, bucket, dan limit dto.
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  DashboardPeriodQueryDto,
  DashboardProductQueryDto,
  DashboardTrendQueryDto,
} from './dashboard-query.dto';

describe('Dashboard query DTO validation', () => {
  it('menerima periode iso, bucket, outlet uuid, dan limit valid', async () => {
    const dto = plainToInstance(DashboardProductQueryDto, {
      date_from: '2026-08-01T00:00:00.000Z',
      date_to: '2026-08-31T23:59:59.999Z',
      outlet_id: '2f8f77de-0fa6-4fc1-a10f-b8849f8171cf',
      limit: '20',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.limit).toBe(20);
  });

  it('menolak tanggal non-iso, bucket tidak dikenal, dan limit di luar batas', async () => {
    const period = plainToInstance(DashboardPeriodQueryDto, {
      date_from: 'kemarin',
      date_to: 'besok',
    });
    const trend = plainToInstance(DashboardTrendQueryDto, {
      date_from: '2026-08-01T00:00:00.000Z',
      date_to: '2026-08-31T23:59:59.999Z',
      bucket: 'WEEK',
    });
    const product = plainToInstance(DashboardProductQueryDto, {
      date_from: '2026-08-01T00:00:00.000Z',
      date_to: '2026-08-31T23:59:59.999Z',
      limit: '101',
    });
    expect(await validate(period)).not.toHaveLength(0);
    expect(await validate(trend)).not.toHaveLength(0);
    expect(await validate(product)).not.toHaveLength(0);
  });
});
