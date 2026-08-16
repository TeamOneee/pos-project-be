import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'refresh_token tidak boleh kosong.' })
  refresh_token?: string;
}
