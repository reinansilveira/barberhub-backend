import { Module } from '@nestjs/common';
import { ProfessionalService } from './professionals.service';
import { ProfessionalController } from './professionals.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [ProfessionalController],
    providers: [ProfessionalService],

})
export class ProfessionalModule { }