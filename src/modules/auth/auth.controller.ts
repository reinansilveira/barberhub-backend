import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ValidateTokenDto } from './dto/validate-token.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { VerifyCodeResponseDto } from './dto/verify-code-response.dto';
import { StartDto } from './dto/start.dto';
import { ForgotPasswordDto } from '../users/dto/forgot-password.dto';
import { ResetClientPasswordDto } from './dto/reset-client-password.dto';
import { ChangeClientPasswordDto } from './dto/change-client-password.dto';
import { TwoFactorChallengeDto } from './dto/two-factor-challenge.dto';
import { DisableTwoFactorDto } from './dto/disable-two-factor.dto';
import { Public } from './decorators/public.decorator';
import { ClientAuthGuard } from './guards/client-auth.guard';
import { ClientThrottlerGuard } from '../../shared/security/client-throttler.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @UseGuards(ClientThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autenticar usuário e retornar access + refresh token',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('client/login')
  @UseGuards(ClientThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autenticar cliente e retornar access + refresh token',
  })
  loginClient(@Body() dto: LoginDto) {
    return this.authService.loginClient(dto);
  }

  @Public()
  @Post('client/forgot-password')
  @UseGuards(ClientThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 15 * 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar código de recuperação da senha do cliente' })
  forgotClientPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestClientPasswordReset(dto.email);
  }

  @Public()
  @Post('client/reset-password')
  @UseGuards(ClientThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redefinir senha do cliente com código temporário' })
  resetClientPassword(@Body() dto: ResetClientPasswordDto) {
    return this.authService.resetClientPassword(
      dto.email,
      dto.code,
      dto.newPassword,
    );
  }

  @Post('client/password')
  @UseGuards(ClientAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Alterar a senha do cliente autenticado' })
  changeClientPassword(
    @Req() request: Request,
    @Body() dto: ChangeClientPasswordDto,
  ) {
    const principal = request['user'] as unknown as { sub: string };
    return this.authService.changeClientPassword(
      principal.sub,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Post('client/two-factor/challenge')
  @UseGuards(ClientAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar código para ativar duas etapas' })
  startClientTwoFactorEnrollment(@Req() request: Request) {
    const principal = request['user'] as unknown as { sub: string };
    return this.authService.startClientTwoFactorEnrollment(principal.sub);
  }

  @Post('client/two-factor/enable')
  @UseGuards(ClientAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ativar autenticação em duas etapas do cliente' })
  enableClientTwoFactor(
    @Req() request: Request,
    @Body() dto: TwoFactorChallengeDto,
  ) {
    const principal = request['user'] as unknown as { sub: string };
    return this.authService.enableClientTwoFactor(
      principal.sub,
      dto.challengeId,
      dto.code,
    );
  }

  @Post('client/two-factor/disable/challenge')
  @UseGuards(ClientAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar código para desativar duas etapas' })
  startClientTwoFactorDisable(@Req() request: Request) {
    const principal = request['user'] as unknown as { sub: string };
    return this.authService.startClientTwoFactorDisable(principal.sub);
  }

  @Post('client/two-factor/disable')
  @UseGuards(ClientAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desativar autenticação em duas etapas do cliente' })
  disableClientTwoFactor(
    @Req() request: Request,
    @Body() dto: DisableTwoFactorDto,
  ) {
    const principal = request['user'] as unknown as { sub: string };
    return this.authService.disableClientTwoFactor(
      principal.sub,
      dto.challengeId,
      dto.code,
      dto.currentPassword,
    );
  }

  @Public()
  @Post('client/two-factor/verify-login')
  @UseGuards(ClientThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Concluir login do cliente com duas etapas' })
  verifyClientTwoFactorLogin(@Body() dto: TwoFactorChallengeDto) {
    return this.authService.verifyClientTwoFactorLogin(
      dto.challengeId,
      dto.code,
    );
  }

  @Public()
  @Post('refresh')
  @UseGuards(ClientThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gerar novo access token usando o refresh token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refresh_token);
  }

  @Public()
  @Post('validate')
  @UseGuards(ClientThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar se um token JWT é válido' })
  validate(@Body() dto: ValidateTokenDto) {
    return this.authService.validate(dto.token);
  }

  @Public()
  @Post('start')
  @UseGuards(ClientThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 15 * 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar autenticação e enviar código OTP' })
  start(@Body() dto: StartDto) {
    return this.authService.start(dto);
  }

  @Public()
  @Post('verify-code')
  @UseGuards(ClientThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar e validar código OTP' })
  verifyCode(@Body() dto: VerifyCodeDto): Promise<VerifyCodeResponseDto> {
    return this.authService.verifyCode(dto);
  }
}
