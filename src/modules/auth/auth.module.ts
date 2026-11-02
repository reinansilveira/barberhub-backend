import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { NotificationSenderService } from '../notifications/sender/notification-sender.service';
import { ClientAuthGuard } from './guards/client-auth.guard';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { ClientOrProfessionalAuthGuard } from './guards/client-or-professional-auth.guard';
import { ProfessionalAuthGuard } from './guards/professional-auth.guard';
import { AdminOrProfessionalAuthGuard } from './guards/admin-or-professional-auth.guard';
import { ClientThrottlerGuard } from '../../shared/security/client-throttler.guard';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    ClientAuthGuard,
    AdminAuthGuard,
    ProfessionalAuthGuard,
    ClientOrProfessionalAuthGuard,
    AdminOrProfessionalAuthGuard,
    ClientThrottlerGuard,
    NotificationSenderService,
  ],
  exports: [
    JwtModule,
    JwtAuthGuard,
    ClientAuthGuard,
    AdminAuthGuard,
    ProfessionalAuthGuard,
    ClientOrProfessionalAuthGuard,
    AdminOrProfessionalAuthGuard,
    ClientThrottlerGuard,
    AuthService,
  ],
})
export class AuthModule {}
