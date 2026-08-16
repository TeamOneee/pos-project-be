// dto validasi query parameter endpoint dashboard bisnis dan operasional.
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

// memvalidasi rentang tanggal iso 8601 dan outlet uuid untuk endpoint bisnis owner.
export class DashboardPeriodQueryDto {
  @IsISO8601({ strict: true }, { message: 'date_from harus tanggal ISO 8601.' })
  date_from!: string;

  @IsISO8601({ strict: true }, { message: 'date_to harus tanggal ISO 8601.' })
  date_to!: string;

  @IsOptional()
  @IsUUID('4', { message: 'outlet_id harus UUID.' })
  outlet_id?: string;
}

// memvalidasi filter outlet pada dashboard operasional tanpa meminta periode.
export class DashboardOutletQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'outlet_id harus UUID.' })
  outlet_id?: string;
}

// menambahkan opsi ukuran bucket hour atau day pada endpoint tren.
export class DashboardTrendQueryDto extends DashboardPeriodQueryDto {
  @IsOptional()
  @IsEnum(['HOUR', 'DAY'], { message: 'bucket harus HOUR atau DAY.' })
  bucket?: ReportingBucket = 'DAY';
}

// menambahkan batas integer limit 1..100 pada ranking produk.
export class DashboardProductQueryDto extends DashboardPeriodQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit harus bilangan bulat.' })
  @Min(1, { message: 'limit minimal 1.' })
  @Max(100, { message: 'limit maksimal 100.' })
  limit?: number = 10;
}
