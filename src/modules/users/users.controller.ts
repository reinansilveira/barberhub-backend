import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth  } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdatePasswordDto } from './dto/update-password';
import { Public } from '../auth/decorators/public.decorator';
@ApiTags('Users')
@ApiBearerAuth() 
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    findAll(@Query('active') active?: string) {
        return this.usersService.findAll(active);
    }

    @Get(':id')
    findById(@Param('id') id: string) {
        return this.usersService.findById(id);
    }

    @Public()
    @Post()
    create(@Body() dto: CreateUserDto) {
        return this.usersService.create(dto);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() dto: CreateUserDto) {
        return this.usersService.update(id, dto);
    }

    @Delete(':id')
    desactivate(@Param('id') id: string) {
        return this.usersService.desactivate(id);
    }

    @Put(':id/password')
    updatePassword(@Param('id') id: string, @Body() dto: UpdatePasswordDto) {
        return this.usersService.updatePassword(id, dto);
    }

    @Public()
    @Post('forgot-password')
    forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.usersService.forgotPassword(dto);
    }

    @Public()
    @Post('verify-code')
    verifyCode(@Body() dto: VerifyCodeDto) {
        return this.usersService.verifyCode(dto);
    }
    
    @Public()
    @Post('reset-password')
    resetPassword(@Body() dto: ResetPasswordDto) {
        return this.usersService.resetPassword(dto);
    }
}