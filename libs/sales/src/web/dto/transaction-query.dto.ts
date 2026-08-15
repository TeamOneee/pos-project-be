import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size?: number = 20;

  get offset(): number {
    return (this.page ?? 0) * (this.size ?? 20);
  }

  get limit(): number {
    return this.size ?? 20;
  }
}

export class TransactionQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  date_from?: string;

  @IsOptional()
  @IsString()
  date_to?: string;

  @IsOptional()
  @IsString()
  outlet_id?: string;
}

export class ReceiptSearchQueryDto {
  @IsString()
  @IsNotEmpty()
  receipt_number!: string;
}

export class TransactionStatusQueryDto {
  @IsString()
  @IsNotEmpty()
  idempotency_key!: string;
}

export class PageResponseDto<T> {
  content: T[];
  page: number;
  size: number;
  total_elements: number;
  total_pages: number;

  static of<T>(
    content: T[],
    total: number,
    page: number,
    size: number,
  ): PageResponseDto<T> {
    const dto = new PageResponseDto<T>();
    dto.content = content;
    dto.page = page;
    dto.size = size;
    dto.total_elements = total;
    dto.total_pages = size > 0 ? Math.ceil(total / size) : 0;
    return dto;
  }
}
