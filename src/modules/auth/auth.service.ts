import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../shared/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { LoginDto } from './dto/login.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { StartDto } from './dto/start.dto';
import Redis from 'ioredis';
import { ClientMapper } from './mappers/client.mapper';
import { NotificationSenderService } from '../notifications/sender/notification-sender.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly notificationSender: NotificationSenderService,
    @Inject('REDIS') private readonly redis: Redis,
  ) { }

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async login({ email, password }: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.active) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.generateTokens(user.id, user.email);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const tokenHash = this.hashToken(refreshToken);

      const exists = await this.redis.get(
        `refresh:${payload.sub}:${tokenHash}`,
      );

      if (!exists) {
        throw new UnauthorizedException('Refresh token inválido');
      }

      await this.redis.del(`refresh:${payload.sub}:${tokenHash}`);

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.active) {
        throw new UnauthorizedException('Usuário inválido');
      }

      return this.generateTokens(user.id, user.email);
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
  }

  async validate(token: string) {
    try {
      const payload = this.jwt.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.active) {
        throw new UnauthorizedException('Usuário inválido');
      }

      return {
        valid: true,
        user: { id: user.id, email: user.email },
      };
    } catch {
      throw new UnauthorizedException('Token inválido');
    }
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const access_token = this.jwt.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    });

    const refresh_token = this.jwt.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    });

    const tokenHash = this.hashToken(refresh_token);

    await this.redis.set(
      `refresh:${userId}:${tokenHash}`,
      '1',
      'EX',
      60 * 60 * 24 * 7,
    );

    return { access_token, refresh_token };
  }

  private async generateOtp(phone: string) {
    const rateKey = `otp:rate:${phone}`;

    const attempts = await this.redis.incr(rateKey);

    if (attempts === 1) {
      await this.redis.expire(rateKey, 60 * 15);
    }

    if (attempts > 3) {
      throw new UnauthorizedException(
        'Muitas tentativas. Tente novamente mais tarde.',
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = await bcrypt.hash(code, 10);

    await this.redis.set(
      `otp:${phone}`,
      JSON.stringify({
        code: hash,
        expiresAt: Date.now() + 5 * 60 * 1000,
      }),
      'EX',
      300,
    );

    await this.notificationSender.sendWhatsApp(
      phone,
      `🔐 Seu código de verificação é: *${code}*\n\nEle expira em 5 minutos. Não compartilhe com ninguém.`,
    );
  }

  async start(data: StartDto) {
    const client = await this.prisma.client.findUnique({
      where: { phone: data.phone },
    });

    if (!client) {
      throw new BadRequestException('Cliente não encontrado');
    }

    await this.generateOtp(data.phone);

    return {
      clientId: client.id,
      message: 'Código enviado',
    };
  }

  async verifyCode(data: VerifyCodeDto) {
    const phone = await this.redis.get(`otp:${data.phone}`);

    if (!phone) {
      throw new BadRequestException('Código expirado ou inexistente');
    }

    const parsed = JSON.parse(phone);

    if (Date.now() > parsed.expiresAt) {
      throw new BadRequestException('Código expirado');
    }

    const valid = await bcrypt.compare(data.code, parsed.code);

    if (!valid) {
      throw new BadRequestException('Código inválido');
    }

    await this.redis.del(`otp:${data.phone}`);

    const client = await this.prisma.client.update({
      where: { phone: data.phone },
      data: {
        phoneVerifiedAt: new Date(),
      },
    });

    return ClientMapper.toVerifyCodeResponse(client);
  }
}