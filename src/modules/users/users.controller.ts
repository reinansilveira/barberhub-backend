import {
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Put,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth  } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdatePasswordDto } from './dto/update-password';
import { UpdateUserAvatarDto } from './dto/update-user-avatar.dto';
import { Public } from '../auth/decorators/public.decorator';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { ClientThrottlerGuard } from '../../shared/security/client-throttler.guard';
import {
    AuthPrincipal,
    hasRole,
    isBackOfficePrincipal,
} from '../auth/types/auth-principal.type';
@ApiTags('Users')
@ApiBearerAuth() 
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    private ensureCanChangeOwnPassword(request: Request, id: string) {
        const principal = request['user'] as AuthPrincipal;

        if (
            (isBackOfficePrincipal(principal) &&
                hasRole(principal, UserRole.ADMIN)) ||
            (principal.accountType !== 'CLIENT' && principal.sub === id)
        ) {
            return;
        }

        throw new ForbiddenException('Você não pode alterar a senha de outro usuário');
    }

    @Patch('me/avatar')
    @UseGuards(AdminAuthGuard)
    @HttpCode(HttpStatus.OK)
    updateMyAvatar(
        @Req() request: Request,
        @Body() dto: UpdateUserAvatarDto,
    ) {
        const principal = request['user'] as unknown as { sub: string };
        return this.usersService.updateAvatar(principal.sub, dto);
    }

    @Get()
    @UseGuards(AdminAuthGuard)
    findAll(@Query('active') active?: string) {
        return this.usersService.findAll(active);
    }

    @Get(':id')
    @UseGuards(AdminAuthGuard)
    findById(@Param('id') id: string) {
        return this.usersService.findById(id);
    }

    @Post()
    @UseGuards(AdminAuthGuard)
    create(@Body() dto: CreateUserDto) {
        return this.usersService.create(dto);
    }

    @Put(':id')
    @UseGuards(AdminAuthGuard)
    update(@Param('id') id: string, @Body() dto: CreateUserDto) {
        return this.usersService.update(id, dto);
    }

    @Delete(':id')
    @UseGuards(AdminAuthGuard)
    deactivate(@Param('id') id: string) {
        return this.usersService.deactivate(id);
    }

    @Put(':id/password')
    updatePassword(
        @Param('id') id: string,
        @Body() dto: UpdatePasswordDto,
        @Req() request: Request,
    ) {
        this.ensureCanChangeOwnPassword(request, id);
        return this.usersService.updatePassword(id, dto);
    }

    @Public()
    @Post('forgot-password')
    @UseGuards(ClientThrottlerGuard)
    @Throttle({ default: { limit: 3, ttl: 15 * 60_000 } })
    forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.usersService.forgotPassword(dto);
    }

    @Public()
    @Post('verify-code')
    @UseGuards(ClientThrottlerGuard)
    @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
    verifyCode(@Body() dto: VerifyCodeDto) {
        return this.usersService.verifyCode(dto);
    }
    
    @Public()
    @Post('reset-password')
    @UseGuards(ClientThrottlerGuard)
    @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
    resetPassword(@Body() dto: ResetPasswordDto) {
        return this.usersService.resetPassword(dto);
    }
}
