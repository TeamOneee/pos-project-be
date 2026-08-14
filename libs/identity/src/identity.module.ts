import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './application/auth.service';
import { PasswordService } from './application/password.service';
import { StaffService } from './application/staff.service';
import { TokenService } from './application/token.service';
import { OutletRepository } from './infrastructure/outlet.repository';
import { RefreshTokenRepository } from './infrastructure/refresh-token.repository';
import { UserRepository } from './infrastructure/user.repository';
import { AuthController } from './web/auth.controller';
import { LoginThrottlerGuard } from './web/login-throttler.guard';
import { StaffController } from './web/staff.controller';

// Autentikasi & manajemen staff (06 §3.1). Hanya bergantung pada `platform`.
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController, StaffController],
  providers: [
    AuthService,
    StaffService,
    PasswordService,
    TokenService,
    UserRepository,
    RefreshTokenRepository,
    OutletRepository,
    LoginThrottlerGuard,
  ],
  exports: [AuthService, StaffService],
})
export class IdentityModule {}
