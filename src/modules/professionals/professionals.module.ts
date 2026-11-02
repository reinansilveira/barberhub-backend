import { Module } from '@nestjs/common';
import { ProfessionalService } from './professionals.service';
import { ProfessionalController } from './professionals.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { ProfessionalAuthGuard } from '../auth/guards/professional-auth.guard';

@Module({
    imports: [PrismaModule],
    controllers: [ProfessionalController],
    providers: [ProfessionalService, AdminAuthGuard, ProfessionalAuthGuard],

})
export class ProfessionalModule { }
