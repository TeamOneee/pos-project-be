import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PlatformModule } from '@app/platform';
import { AuthService } from './application/auth.service';
import { PasswordService } from './application/password.service';
import { StaffService } from './application/staff.service';
import { TokenService } from './application/token.service';
import { UserReadPort } from './application/ports/user-read.port';
import { OutletRepository } from './infrastructure/outlet.repository';
import { UserReadService } from './infrastructure/user-read.service';
import { UserRepository } from './infrastructure/user.repository';
import { AuthController } from './web/auth.controller';
import { LoginThrottlerGuard } from './web/login-throttler.guard';
import { StaffController } from './web/staff.controller';

// Autentikasi & manajemen staff (06 §3.1). Hanya bergantung pada `platform`.
@Module({
  imports: [PlatformModule, JwtModule.register({})],
  controllers: [AuthController, StaffController],
  providers: [
    AuthService,
    StaffService,
    PasswordService,
    TokenService,
    UserRepository,
    OutletRepository,
    LoginThrottlerGuard,
    UserReadService,
    {
      provide: UserReadPort,
      useExisting: UserReadService,
    },
  ],
  exports: [AuthService, StaffService, UserReadPort],
})
export class IdentityModule {}
