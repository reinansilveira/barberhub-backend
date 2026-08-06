import { Module } from '@nestjs/common';
import { ClientService } from './client.service';
import { ClientController } from './client.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { BrLocationValidator } from 'src/shared/validators/br-location.validator';

@Module({
  imports: [PrismaModule],
  controllers: [ClientController],
  providers: [ClientService, BrLocationValidator],
  exports: [ClientService],
})
export class ClientModule { }
