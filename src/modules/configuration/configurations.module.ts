import { Module } from '@nestjs/common';
import { ConfigurationsController } from './configurations.controller';
import { ConfigurationsService } from './configurations.service';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [ConfigurationsController],
    providers: [ConfigurationsService],
})
export class ConfigurationsModule {}