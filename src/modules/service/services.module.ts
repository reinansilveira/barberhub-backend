import { Module } from '@nestjs/common';
import { Services } from './services.service';
import { ServicesController } from './services.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
    controllers: [ServicesController],
    providers: [Services],

})
export class ServicesModule { }
