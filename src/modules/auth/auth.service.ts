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
import { UserRole } from '@prisma/client';

type TwoFactorPurpose = 'LOGIN' | 'ENROLLMENT' | 'DISABLE';

type TwoFactorChallengePayload = {
  clientId: string;
  purpose: TwoFactorPurpose;
  code: string;
  expiresAt: number;
};

const TWO_FACTOR_CODE_TTL_SECONDS = 5 * 60;
const TWO_FACTOR_RATE_TTL_SECONDS = 15 * 60;
const TWO_FACTOR_MAX_SEND_ATTEMPTS = 3;
const TWO_FACTOR_MAX_VERIFY_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly notificationSender: NotificationSenderService,
    @Inject('REDIS') private readonly redis: Redis,
  ) {}

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async login({ email, password }: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.active || !user.password) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.generateTokens({
      id: user.id,
      email: user.email,
      accountType: 'USER',
      role: user.role,
      sessionVersion: user.sessionVersion,
    });
  }

  async loginClient({ email, password }: LoginDto) {
    const client = await this.prisma.client.findFirst({
      where: {
        active: true,
        user: {
          is: {
            email,
            active: true,
          },
        },
      },
      include: { user: true },
    });

    if (
      !client ||
      !client.user.password ||
      !(await bcrypt.compare(password, client.user.password))
    ) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    if (client.user.twoFactorEnabled) {
      return this.createTwoFactorChallenge(client, 'LOGIN');
    }

    return this.generateTokens(
      {
        id: client.id,
        userId: client.userId,
        email: client.user.email,
        accountType: 'CLIENT',
        role: UserRole.CLIENT,
        sessionVersion: client.user.sessionVersion,
      },
      client.user.mustChangePassword,
    );
  }

  async issueClientSession(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: { user: true },
    });

    if (!client || !client.active || !client.user.active)
      throw new UnauthorizedException('Cliente inválido');
    
    return this.generateTokens(
      {
        id: client.id,
        userId: client.userId,
        email: client.user.email,
        accountType: 'CLIENT',
        role: UserRole.CLIENT,
        sessionVersion: client.user.sessionVersion,
      },
      client.user.mustChangePassword,
    );
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const tokenHash = this.hashToken(refreshToken);

      const exists = await this.redis.get(
        `refresh:${
          payload.accountType === 'CLIENT'
            ? `CLIENT:${payload.sub}`
            : payload.sub
        }:${tokenHash}`,
      );

      if (!exists) {
        throw new UnauthorizedException('Refresh token inválido');
      }

      await this.redis.del(
        `refresh:${
          payload.accountType === 'CLIENT'
            ? `CLIENT:${payload.sub}`
            : payload.sub
        }:${tokenHash}`,
      );

      if (payload.accountType === 'CLIENT') {
        const client = await this.prisma.client.findUnique({
          where: { id: payload.sub },
          include: { user: true },
        });
        if (!client || !client.active || !client.user.active) {
          throw new UnauthorizedException('Cliente inválido');
        }

        if (payload.sessionVersion !== client.user.sessionVersion) {
          throw new UnauthorizedException('Refresh token inválido');
        }

        return this.generateTokens(
          {
            id: client.id,
            userId: client.userId,
            email: client.user.email,
            accountType: 'CLIENT',
            role: UserRole.CLIENT,
            sessionVersion: client.user.sessionVersion,
          },
          client.user.mustChangePassword,
        );
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user || !user.active) {
        throw new UnauthorizedException('Usuário inválido');
      }

      if (payload.sessionVersion !== user.sessionVersion) {
        throw new UnauthorizedException('Refresh token inválido');
      }

      return this.generateTokens({
        id: user.id,
        email: user.email,
        accountType: 'USER',
        role: user.role,
        sessionVersion: user.sessionVersion,
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
  }

  async validate(token: string) {
    try {
      const payload = this.jwt.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      if (payload.accountType === 'CLIENT') {
        const client = await this.prisma.client.findUnique({
          where: { id: payload.sub },
          include: { user: true },
        });

        if (!client || !client.active || !client.user.active) {
          throw new UnauthorizedException('Usuário inválido');
        }

        if (payload.sessionVersion !== client.user.sessionVersion) {
          throw new UnauthorizedException('Token inválido');
        }

        return {
          valid: true,
          user: {
            id: client.id,
            email: client.user.email,
            accountType: 'CLIENT',
          },
        };
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.active) {
        throw new UnauthorizedException('Usuário inválido');
      }

      if (payload.sessionVersion !== user.sessionVersion) {
        throw new UnauthorizedException('Token inválido');
      }

      return {
        valid: true,
        user: { id: user.id, email: user.email },
      };
    } catch {
      throw new UnauthorizedException('Token inválido');
    }
  }

  private async generateTokens(
    principal: {
      id: string;
      userId?: string;
      email: string | null;
      accountType: 'USER' | 'CLIENT';
      role: UserRole;
      sessionVersion: number;
    },
    mustChangePassword = false,
  ) {
    const roles =
      principal.accountType === 'CLIENT'
        ? [UserRole.CLIENT]
        : await this.resolveRoles(
            principal.userId ?? principal.id,
            principal.role,
          );
    const payload = {
      sub: principal.id,
      email: principal.email,
      accountType: principal.accountType,
      role: principal.role,
      roles,
      sessionVersion: principal.sessionVersion,
    };

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
      `refresh:${
        principal.accountType === 'CLIENT'
          ? `CLIENT:${principal.id}`
          : principal.id
      }:${tokenHash}`,
      '1',
      'EX',
      60 * 60 * 24 * 7,
    );

    return principal.accountType === 'CLIENT'
      ? { access_token, refresh_token, mustChangePassword }
      : { access_token, refresh_token };
  }

  private async resolveRoles(userId: string, fallbackRole: UserRole) {
    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: { userId },
      select: { role: true },
    });

    const roles = (assignments ?? [])
      .map(({ role }) => role)
      .filter((role): role is UserRole => Object.values(UserRole).includes(role));
    return roles.length ? roles : [fallbackRole];
  }

  async requestClientPasswordReset(email: string) {
    const client = await this.prisma.client.findFirst({
      where: {
        active: true,
        user: {
          is: {
            email,
            active: true,
          },
        },
      },
      include: { user: true },
    });
    if (!client)
      return { message: 'Se houver uma conta, enviaremos as instruções.' };
    const code = crypto.randomInt(100000, 1000000).toString();
    await this.redis.set(
      `client:password-reset:${client.userId}`,
      await bcrypt.hash(code, 10),
      'EX',
      15 * 60,
    );
    const message = `Seu código para redefinir a senha é: ${code}. Ele expira em 15 minutos.`;
    await Promise.all([
      this.notificationSender.sendEmail(
        client.user.email!,
        'Redefinição de senha',
        `<p>${message}</p>`,
        message,
      ),
      client.user.phone
        ? this.notificationSender.sendWhatsApp(client.user.phone, message)
        : Promise.resolve(),
    ]);
    return { message: 'Se houver uma conta, enviaremos as instruções.' };
  }

  async resetClientPassword(email: string, code: string, newPassword: string) {
    const client = await this.prisma.client.findFirst({
      where: {
        active: true,
        user: {
          is: {
            email,
            active: true,
          },
        },
      },
      include: { user: true },
    });
    const key = client ? `client:password-reset:${client.userId}` : '';
    const codeHash = client ? await this.redis.get(key) : null;
    if (!client || !codeHash || !(await bcrypt.compare(code, codeHash))) {
      throw new BadRequestException('Código inválido ou expirado.');
    }
    await this.prisma.user.update({
      where: { id: client.userId },
      data: {
        password: await bcrypt.hash(newPassword, 10),
        passwordSetAt: new Date(),
        mustChangePassword: false,
        sessionVersion: { increment: 1 },
      },
    });
    await this.redis.del(key);
    return { message: 'Senha redefinida com sucesso.' };
  }

  async changeClientPassword(
    clientId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const client = await this.findActiveClientForSecurity(clientId);

    if (
      !client.user.password ||
      !(await bcrypt.compare(currentPassword, client.user.password))
    ) {
      throw new BadRequestException('Senha atual incorreta.');
    }

    await this.prisma.user.update({
      where: { id: client.userId },
      data: {
        password: await bcrypt.hash(newPassword, 10),
        passwordSetAt: new Date(),
        mustChangePassword: false,
        sessionVersion: { increment: 1 },
      },
    });

    return {
      message:
        'Senha atualizada com sucesso. Entre novamente para continuar.',
    };
  }

  async startClientTwoFactorEnrollment(clientId: string) {
    const client = await this.findActiveClientForSecurity(clientId);

    if (client.user.twoFactorEnabled) {
      throw new BadRequestException(
        'A autenticação em duas etapas já está ativada.',
      );
    }

    return this.createTwoFactorChallenge(client, 'ENROLLMENT');
  }

  async enableClientTwoFactor(
    clientId: string,
    challengeId: string,
    code: string,
  ) {
    const client = await this.findActiveClientForSecurity(clientId);

    if (client.user.twoFactorEnabled) {
      throw new BadRequestException(
        'A autenticação em duas etapas já está ativada.',
      );
    }

    await this.verifyTwoFactorChallenge(
      challengeId,
      code,
      'ENROLLMENT',
      clientId,
    );

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: client.userId },
        data: {
          twoFactorEnabled: true,
          sessionVersion: { increment: 1 },
        },
      }),
      this.prisma.client.update({
        where: { id: client.id },
        data: { phoneVerifiedAt: new Date() },
      }),
    ]);

    return {
      message:
        'Autenticação em duas etapas ativada. Entre novamente para continuar.',
      twoFactorEnabled: true,
    };
  }

  async startClientTwoFactorDisable(clientId: string) {
    const client = await this.findActiveClientForSecurity(clientId);

    if (!client.user.twoFactorEnabled) {
      throw new BadRequestException(
        'A autenticação em duas etapas não está ativada.',
      );
    }

    return this.createTwoFactorChallenge(client, 'DISABLE');
  }

  async disableClientTwoFactor(
    clientId: string,
    challengeId: string,
    code: string,
    currentPassword: string,
  ) {
    const client = await this.findActiveClientForSecurity(clientId);

    if (!client.user.twoFactorEnabled) {
      throw new BadRequestException(
        'A autenticação em duas etapas não está ativada.',
      );
    }

    if (
      !client.user.password ||
      !(await bcrypt.compare(currentPassword, client.user.password))
    ) {
      throw new BadRequestException('Senha atual incorreta.');
    }

    await this.verifyTwoFactorChallenge(
      challengeId,
      code,
      'DISABLE',
      clientId,
    );

    await this.prisma.user.update({
      where: { id: client.userId },
      data: {
        twoFactorEnabled: false,
        sessionVersion: { increment: 1 },
      },
    });

    return {
      message:
        'Autenticação em duas etapas desativada. Entre novamente para continuar.',
      twoFactorEnabled: false,
    };
  }

  async verifyClientTwoFactorLogin(challengeId: string, code: string) {
    const clientId = await this.verifyTwoFactorChallenge(
      challengeId,
      code,
      'LOGIN',
    );
    const client = await this.findActiveClientForSecurity(clientId);

    if (!client.user.twoFactorEnabled) {
      throw new UnauthorizedException('Desafio de segurança inválido.');
    }

    return this.generateTokens(
      {
        id: client.id,
        userId: client.userId,
        email: client.user.email,
        accountType: 'CLIENT',
        role: UserRole.CLIENT,
        sessionVersion: client.user.sessionVersion,
      },
      client.user.mustChangePassword,
    );
  }

  private async findActiveClientForSecurity(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: { user: true },
    });

    if (!client || !client.active || !client.user.active) {
      throw new UnauthorizedException('Cliente inválido');
    }

    return client;
  }

  private async createTwoFactorChallenge(
    client: Awaited<ReturnType<AuthService['findActiveClientForSecurity']>>,
    purpose: TwoFactorPurpose,
  ) {
    if (
      !client.user.phone ||
      (purpose !== 'ENROLLMENT' && !client.phoneVerifiedAt)
    ) {
      throw new BadRequestException(
        'Confirme um telefone antes de ativar a autenticação em duas etapas.',
      );
    }

    const rateKey = `client:two-factor:${purpose}:rate:${client.id}`;
    const sentCount = await this.redis.incr(rateKey);

    if (sentCount === 1) {
      await this.redis.expire(rateKey, TWO_FACTOR_RATE_TTL_SECONDS);
    }

    if (sentCount > TWO_FACTOR_MAX_SEND_ATTEMPTS) {
      throw new UnauthorizedException(
        'Muitas tentativas. Tente novamente mais tarde.',
      );
    }

    const challengeId = crypto.randomUUID();
    const code = crypto.randomInt(100000, 1000000).toString();
    const payload: TwoFactorChallengePayload = {
      clientId: client.id,
      purpose,
      code: await bcrypt.hash(code, 10),
      expiresAt: Date.now() + TWO_FACTOR_CODE_TTL_SECONDS * 1000,
    };

    await this.redis.set(
      this.twoFactorChallengeKey(challengeId),
      JSON.stringify(payload),
      'EX',
      TWO_FACTOR_CODE_TTL_SECONDS,
    );

    await this.notificationSender.sendWhatsApp(
      client.user.phone,
      `Seu código de segurança é: ${code}. Ele expira em 5 minutos. Não compartilhe este código.`,
    );

    return {
      requiresTwoFactor: purpose === 'LOGIN',
      challengeId,
      expiresInSeconds: TWO_FACTOR_CODE_TTL_SECONDS,
      message: 'Código de segurança enviado para seu telefone verificado.',
    };
  }

  private async verifyTwoFactorChallenge(
    challengeId: string,
    code: string,
    purpose: TwoFactorPurpose,
    expectedClientId?: string,
  ) {
    const challengeKey = this.twoFactorChallengeKey(challengeId);
    const rawChallenge = await this.redis.get(challengeKey);

    if (!rawChallenge) {
      throw new BadRequestException('Código inválido ou expirado.');
    }

    let challenge: TwoFactorChallengePayload;

    try {
      challenge = JSON.parse(rawChallenge) as TwoFactorChallengePayload;
    } catch {
      await this.redis.del(challengeKey);
      throw new BadRequestException('Código inválido ou expirado.');
    }

    if (
      challenge.purpose !== purpose ||
      (expectedClientId && challenge.clientId !== expectedClientId) ||
      Date.now() > challenge.expiresAt
    ) {
      await this.redis.del(challengeKey);
      throw new BadRequestException('Código inválido ou expirado.');
    }

    const attemptsKey = `client:two-factor:attempt:${challengeId}`;
    const attempts = await this.redis.incr(attemptsKey);

    if (attempts === 1) {
      await this.redis.expire(attemptsKey, TWO_FACTOR_CODE_TTL_SECONDS);
    }

    if (attempts > TWO_FACTOR_MAX_VERIFY_ATTEMPTS) {
      await this.redis.del(challengeKey, attemptsKey);
      throw new BadRequestException('Código inválido ou expirado.');
    }

    if (!(await bcrypt.compare(code, challenge.code))) {
      throw new BadRequestException('Código inválido ou expirado.');
    }

    await this.redis.del(challengeKey, attemptsKey);
    return challenge.clientId;
  }

  private twoFactorChallengeKey(challengeId: string) {
    return `client:two-factor:challenge:${challengeId}`;
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
    const client = await this.prisma.client.findFirst({
      where: {
        active: true,
        user: {
          is: {
            phone: data.phone,
            active: true,
          },
        },
      },
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

    const client = await this.prisma.client.findFirst({
      where: {
        active: true,
        user: {
          is: {
            phone: data.phone,
            active: true,
          },
        },
      },
      include: { user: true },
    });

    if (!client) {
      throw new BadRequestException('Cliente não encontrado');
    }

    const updated = await this.prisma.client.update({
      where: { id: client.id },
      data: {
        phoneVerifiedAt: new Date(),
      },
      include: { user: true },
    });

    return ClientMapper.toVerifyCodeResponse(updated);
  }
}
