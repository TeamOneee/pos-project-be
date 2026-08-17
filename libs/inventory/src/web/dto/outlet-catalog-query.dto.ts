import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { PageRequestDto } from '@app/platform';

export class OutletCatalogQueryDto extends PageRequestDto {
  @IsUUID()
  @IsNotEmpty()
  outlet_id!: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  category_id?: string;
}
