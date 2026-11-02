import {
  Injectable,
  BadRequestException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import { AuthService } from '../auth/auth.service';
import { GoogleUserDto } from '../auth/dto/google-user.dto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { generateTempPassword } from '../../shared/security/generate-temp-password';
import { CreateClientRegisterDto } from './dto/create-client-register.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { ClientCreateMapper } from './mappers/client-create.mapper';
import { UserCreateMapper } from './mappers/user-create.mapper';
import { clientInclude, ClientWithUser } from './client.include';

const SALT_ROUNDS = 10;

@Injectable()
export class ClientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    @Inject('REDIS') private readonly redis: Redis,
  ) {}

  private async createClientWithUser(params: {
    name: string;
    email: string | null;
    phone: string;
    password: string | null;
    passwordSetAt: Date | null;
  }): Promise<ClientWithUser> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          ...UserCreateMapper.fromClientParams(params),
          roleAssignments: { create: { role: UserRole.CLIENT } },
        },
      });

      return tx.client.create({
        data: {
          userId: user.id,
          phoneVerifiedAt: null,
        },
        include: clientInclude,
      });
    });
  }

  private async findOrCreateGoogleUser(googleUser: GoogleUserDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: { email: googleUser.email },
    });

    if (!existingUser) {
      return this.prisma.user.create({
        data: {
          ...UserCreateMapper.fromGoogleUser(
            googleUser,
            this.buildClientName(googleUser) || googleUser.email!,
          ),
          roleAssignments: { create: { role: UserRole.CLIENT } },
        },
      });
    }

    const avatarChanged =
      googleUser.picture && existingUser.avatar !== googleUser.picture;

    if (!avatarChanged) {
      return existingUser;
    }

    return this.prisma.user.update({
      where: { id: existingUser.id },
      data: { avatar: googleUser.picture },
    });
  }

  private async findOrCreateClientForUser(
    userId: string,
  ): Promise<ClientWithUser> {
    const existingClient = await this.prisma.client.findUnique({
      where: { userId },
      include: clientInclude,
    });

    if (existingClient) {
      return existingClient;
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.userRoleAssignment.upsert({
        where: { userId_role: { userId, role: UserRole.CLIENT } },
        update: {},
        create: { userId, role: UserRole.CLIENT },
      });

      return tx.client.create({
        data: {
          userId,
          phoneVerifiedAt: null,
        },
        include: clientInclude,
      });
    });
  }

  /**
   * Public booking intentionally resolves contacts server-side. It never
   * exposes an existing client id or creates an authenticated session.
   */
  public async findOrCreatePublicBookingClient(data: {
    name: string;
    email: string;
    phone: string;
  }): Promise<ClientWithUser> {
    const email = data.email.trim().toLowerCase();
    const phone = data.phone.replace(/\D/g, '');
    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    });

    if (existingUser) {
      const sameEmail =
        !existingUser.email || existingUser.email.toLowerCase() === email;
      const samePhone = !existingUser.phone || existingUser.phone === phone;

      if (!sameEmail || !samePhone) {
        throw new ConflictException(
          'Os dados informados não correspondem à mesma conta.',
        );
      }

      return this.findOrCreateClientForUser(existingUser.id);
    }

    return this.createClientWithUser({
      name: data.name.trim(),
      email,
      phone,
      password: null,
      passwordSetAt: null,
    });
  }

  private async findClientById(
    clientId: string,
  ): Promise<ClientWithUser | null> {
    return this.prisma.client.findUnique({
      where: { id: clientId },
      include: clientInclude,
    });
  }

  private async ensureUserContactAvailable(
    data:
      | Pick<CreateClientDto, 'email' | 'phone'>
      | Pick<CreateClientRegisterDto, 'email' | 'phone'>,
    excludeUserId?: string,
  ) {
    const conditions: Prisma.UserWhereInput[] = [];

    if (data.email) {
      conditions.push({ email: data.email });
    }

    if (data.phone) {
      conditions.push({ phone: data.phone });
    }

    if (!conditions.length) {
      return;
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: conditions,
        NOT: excludeUserId ? { id: excludeUserId } : undefined,
      },
    });

    if (existingUser) {
      if (existingUser.phone === data.phone) {
        throw new ConflictException('Telefone já cadastrado');
      }

      if (existingUser.email === data.email) {
        throw new ConflictException('Email já cadastrado');
      }

      throw new ConflictException('Usuário já cadastrado');
    }
  }

  private buildClientName(googleUser: GoogleUserDto) {
    return `${googleUser.firstName ?? ''} ${googleUser.lastName ?? ''}`.trim();
  }

  public async ensureCredentials(
    clientId: string,
  ): Promise<{ plainPassword: string | null }> {
    const client = await this.findClientById(clientId);

    if (!client) {
      throw new BadRequestException('Cliente não encontrado');
    }

    const userAuth = await this.prisma.user.findUnique({
      where: { id: client.userId },
      select: { password: true },
    });

    if (userAuth?.password) {
      return { plainPassword: null };
    }

    const plainPassword = generateTempPassword();
    const hashed = await bcrypt.hash(plainPassword, SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: client.userId },
      data: {
        password: hashed,
        passwordSetAt: new Date(),
        mustChangePassword: true,
      },
    });

    return { plainPassword };
  }

  public async findByPhone(phone: string) {
    return this.prisma.client.findFirst({
      where: { user: { is: { phone } } },
      include: clientInclude,
    });
  }

  public async getDashboard(clientId: string) {
    const client = await this.findClientById(clientId);

    if (!client) {
      throw new BadRequestException('Cliente não encontrado');
    }

    const appointments = await this.prisma.appointment.findMany({
      where: { clientId },
      orderBy: { scheduledAt: 'desc' },
      include: {
        professional: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
          },
        },
      },
    });

    return { client: ClientCreateMapper.toResponse(client), appointments };
  }

  public async findById(id: string, active?: boolean) {
    const client = await this.prisma.client.findFirst({
      where: {
        id,
        ...(active !== undefined && { active }),
      },
      include: clientInclude,
    });

    return client ? ClientCreateMapper.toResponse(client) : null;
  }

  public async create(data: CreateClientDto) {
    await this.ensureUserContactAvailable(data);

    const client = await this.createClientWithUser({
      name: data.name,
      email: data.email ?? null,
      phone: data.phone,
      password: null,
      passwordSetAt: null,
    });

    return ClientCreateMapper.toResponse(client);
  }

  public async register(data: CreateClientRegisterDto) {
    await this.ensureUserContactAvailable(data);

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    const client = await this.createClientWithUser({
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: hashedPassword,
      passwordSetAt: new Date(),
    });

    const session = await this.authService.issueClientSession(client.id);

    return {
      ...ClientCreateMapper.toResponse(client),
      ...session,
    };
  }

  public async loginWithGoogle(googleUser: GoogleUserDto) {
    if (!googleUser.email) {
      throw new BadRequestException(
        'Não foi possível obter o email da conta Google',
      );
    }

    const user = await this.findOrCreateGoogleUser(googleUser);
    const client = await this.findOrCreateClientForUser(user.id);

    if (!user.active || !client.active) {
      throw new BadRequestException('Cliente inativo');
    }

    const session = await this.authService.issueClientSession(client.id);

    return {
      ...ClientCreateMapper.toResponse(client),
      ...session,
    };
  }

  public async createGoogleExchangeCode(googleUser: GoogleUserDto) {
    const code = crypto.randomBytes(24).toString('hex');

    await this.redis.set(
      `google-exchange:${code}`,
      JSON.stringify(googleUser),
      'EX',
      60,
    );

    return code;
  }

  public async exchangeGoogleCode(code: string) {
    if (!code) {
      throw new BadRequestException('Código inválido');
    }

    const raw = await this.redis.get(`google-exchange:${code}`);

    if (!raw) {
      throw new BadRequestException('Código inválido ou expirado');
    }

    await this.redis.del(`google-exchange:${code}`);

    let googleUser: GoogleUserDto;

    try {
      googleUser = JSON.parse(raw);
    } catch {
      throw new BadRequestException('Código inválido ou expirado');
    }

    return this.loginWithGoogle(googleUser);
  }

  public async update(id: string, data: CreateClientDto) {
    const existingClient = await this.findClientById(id);

    if (!existingClient) {
      throw new BadRequestException('Cliente não encontrado');
    }

    await this.ensureUserContactAvailable(data, existingClient.userId);

    const phoneChanged = existingClient.user.phone !== data.phone;

    const client = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existingClient.userId },
        data: {
          name: data.name,
          email: data.email ?? null,
          phone: data.phone,
          ...(phoneChanged && {
            twoFactorEnabled: false,
            sessionVersion: { increment: 1 },
          }),
        },
      });

      if (phoneChanged) {
        await tx.client.update({
          where: { id },
          data: { phoneVerifiedAt: null },
        });
      }

      return tx.client.findUnique({
        where: { id },
        include: clientInclude,
      });
    });

    if (!client) {
      throw new BadRequestException('Cliente não encontrado');
    }

    return ClientCreateMapper.toResponse(client);
  }

  public async updateAvatar(id: string, data: { avatar: string }) {
    const existingClient = await this.findClientById(id);

    if (!existingClient) {
      throw new BadRequestException('Cliente não encontrado');
    }

    const client = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existingClient.userId },
        data: { avatar: data.avatar },
      });

      return tx.client.findUnique({
        where: { id },
        include: clientInclude,
      });
    });

    if (!client) {
      throw new BadRequestException('Cliente não encontrado');
    }

    return ClientCreateMapper.toResponse(client);
  }

  public async desactivate(id: string) {
    const existingClient = await this.findClientById(id);

    if (!existingClient) {
      throw new BadRequestException('Cliente não encontrado');
    }

    const client = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existingClient.userId },
        data: { active: false },
      });

      return tx.client.update({
        where: { id },
        data: {
          active: false,
          reengagementSentAt: null,
        },
        include: clientInclude,
      });
    });

    return ClientCreateMapper.toResponse(client);
  }
}
