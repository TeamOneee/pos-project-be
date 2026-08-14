import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { CurrentUser, Public } from '@app/platform';
import { AuthUser } from '@app/platform';
import { AuthService } from '../application/auth.service';
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { LoginThrottlerGuard } from './login-throttler.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // FR-AUTH-001-004, FR-TEN-001-003
  @Public()
  @Post('register')
  @SkipThrottle()
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    return this.authService.register(dto);
  }

  // FR-AUTH-005-007, FR-AUTH-010
  @Public()
  @UseGuards(LoginThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthTokensDto> {
    return this.authService.login(dto);
  }

  // FR-AUTH-007/008
  @Public()
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    return this.authService.refresh(dto);
  }

  // FR-AUTH-008: logout mencabut refresh token
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(
    @CurrentUser() _actor: AuthUser,
    @Body() dto: LogoutDto,
  ): Promise<void> {
    return this.authService.logout(dto);
  }
}
