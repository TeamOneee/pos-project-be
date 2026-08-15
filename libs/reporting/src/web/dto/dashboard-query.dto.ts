import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ReportingBucket } from '../../application/reporting.models';

// memvalidasi rentang dan outlet filter yang dipakai semua endpoint dashboard Owner.
export class DashboardPeriodQueryDto {
  @IsISO8601({ strict: true }, { message: 'date_from harus tanggal ISO 8601.' })
  date_from!: string;

  @IsISO8601({ strict: true }, { message: 'date_to harus tanggal ISO 8601.' })
  date_to!: string;

  @IsOptional()
  @IsUUID('4', { message: 'outlet_id harus UUID.' })
  outlet_id?: string;
}

// menambahkan pilihan ukuran bucket untuk endpoint trend.
export class DashboardTrendQueryDto extends DashboardPeriodQueryDto {
  @IsOptional()
  @IsEnum(['HOUR', 'DAY'], { message: 'bucket harus HOUR atau DAY.' })
  bucket?: ReportingBucket = 'DAY';
}

// menambahkan batas jumlah hasil ranking product agar response tetap kecil.
export class DashboardProductQueryDto extends DashboardPeriodQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit harus bilangan bulat.' })
  @Min(1, { message: 'limit minimal 1.' })
  @Max(100, { message: 'limit maksimal 100.' })
  limit?: number = 10;
}
