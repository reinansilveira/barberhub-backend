import { Module } from '@nestjs/common';
import { ProfessionalServicesService } from './professional-services.service';
import { ProfessionalServicesController } from './professional-services.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProfessionalServicesController],
  providers: [ProfessionalServicesService],
})
export class ProfessionalServicesModule {}