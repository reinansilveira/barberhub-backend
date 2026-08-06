import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class ResetClientPasswordDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: '483920' })
  @IsString()
  @Length(6, 6)
  code: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  newPassword: string;
}
