import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { PageQueryDto } from './pagination.dto';

export class OutletCatalogQueryDto extends PageQueryDto {
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
