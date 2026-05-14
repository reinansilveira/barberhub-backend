import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RespondReviewDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    response: string;
}