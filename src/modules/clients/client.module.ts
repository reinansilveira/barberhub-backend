import { Module } from '@nestjs/common';
import { ClientService } from './client.service';
import { ClientController } from './client.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { BrLocationValidator } from 'src/shared/validators/br-location.validator';
import { AuthModule } from '../auth/auth.module';
import { GoogleClientStrategy } from '../auth/strategies/google-client.strategy';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ClientController],
  providers: [ClientService, BrLocationValidator, GoogleClientStrategy],
  exports: [ClientService],
})
export class ClientModule {}
