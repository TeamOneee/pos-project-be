import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshDto {
  @IsString()
  @IsNotEmpty({ message: 'refresh_token wajib diisi.' })
  refresh_token: string;
}
