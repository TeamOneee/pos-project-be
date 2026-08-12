import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import type { UserPayload } from 'src/common/decorators/get-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private service: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const data = await this.service.register(dto);
    return {
      message: 'Register successfully',
      data,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const data = await this.service.signin(dto);
    return {
      message: 'Login successfully',
      data,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@GetUser() user: UserPayload) {
    return {
      message: 'User data retrieved',
      data: user,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  logout() {
    return {
      message: 'Logout successfully',
      data: null,
    };
  }
}
