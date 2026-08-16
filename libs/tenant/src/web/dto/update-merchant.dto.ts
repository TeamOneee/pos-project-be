import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

// FR-TEN-011: hanya `name` yang bisa diubah OWNER pada merchant.
export class UpdateMerchantDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Nama merchant tidak boleh kosong.' })
  @MaxLength(150)
  name?: string;
}
