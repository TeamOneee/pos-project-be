import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class CategoryListQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }): unknown => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: 'is_active harus boolean.' })
  is_active?: boolean;
}
