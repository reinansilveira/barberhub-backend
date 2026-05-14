import { PartialType } from '@nestjs/swagger';
import { CreateProfessionalServiceDto } from './create-professional-service.dto';

export class UpdateProfessionalServiceDto extends PartialType(CreateProfessionalServiceDto) { }