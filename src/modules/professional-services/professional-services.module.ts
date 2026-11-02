import { Module } from '@nestjs/common';
import { ProfessionalServicesService } from './professional-services.service';
import { ProfessionalServicesController } from './professional-services.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ProfessionalServicesController],
  providers: [ProfessionalServicesService],
})
export class ProfessionalServicesModule {}
