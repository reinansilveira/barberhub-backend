import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: {
    sub: string;
    email?: string;
    accountType?: 'USER' | 'CLIENT';
  }) {
    if (payload.accountType === 'CLIENT') {
      const client = await this.prisma.client.findUnique({
        where: { id: payload.sub },
        include: { user: true },
      });
      if (!client || !client.active || !client.user.active) {
        throw new UnauthorizedException('Cliente inativo ou não encontrado');
      }
      return { id: client.id, email: client.user.email, accountType: 'CLIENT' };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException('Usuário inativo ou não encontrado');
    }

    return { id: user.id, email: user.email, accountType: 'USER' };
  }
}
