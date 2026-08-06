import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateClientAvatarDto {
    @ApiProperty({ example: 'https://meusite.com/uploads/avatar.jpg' })
    @IsString({ message: 'O campo [avatar] precisa ser uma string.' })
    @IsNotEmpty({ message: 'O campo [avatar] é obrigatório.' })
    avatar: string;
}
