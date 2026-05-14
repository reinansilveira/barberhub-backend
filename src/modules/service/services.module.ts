import { Module } from '@nestjs/common';
import { Services } from './services.service';
import { ServicesController } from './services.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [ServicesController],
    providers: [Services],

})
export class ServicesModule { }