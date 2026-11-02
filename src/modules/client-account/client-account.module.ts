import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ClientAccountController } from './client-account.controller';
import { ClientAccountService } from './client-account.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ClientAccountController],
  providers: [ClientAccountService],
  exports: [ClientAccountService],
})
export class ClientAccountModule {}
