import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ValidateTokenDto } from './dto/validate-token.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { VerifyCodeResponseDto } from './dto/verify-code-response.dto';
import { StartDto } from './dto/start.dto';
import { ForgotPasswordDto } from '../users/dto/forgot-password.dto';
import { ResetClientPasswordDto } from './dto/reset-client-password.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autenticar usuário e retornar access + refresh token',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('client/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autenticar cliente e retornar access + refresh token',
  })
  loginClient(@Body() dto: LoginDto) {
    return this.authService.loginClient(dto);
  }

  @Public()
  @Post('client/forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar código de recuperação da senha do cliente' })
  forgotClientPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestClientPasswordReset(dto.email);
  }

  @Public()
  @Post('client/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redefinir senha do cliente com código temporário' })
  resetClientPassword(@Body() dto: ResetClientPasswordDto) {
    return this.authService.resetClientPassword(
      dto.email,
      dto.code,
      dto.newPassword,
    );
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gerar novo access token usando o refresh token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refresh_token);
  }

  @Public()
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar se um token JWT é válido' })
  validate(@Body() dto: ValidateTokenDto) {
    return this.authService.validate(dto.token);
  }

  @Public()
  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar autenticação e enviar código OTP' })
  start(@Body() dto: StartDto) {
    return this.authService.start(dto);
  }

  @Public()
  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar e validar código OTP' })
  verifyCode(@Body() dto: VerifyCodeDto): Promise<VerifyCodeResponseDto> {
    return this.authService.verifyCode(dto);
  }
}
