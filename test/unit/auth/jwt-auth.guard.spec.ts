import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../../../src/modules/auth/guards/jwt-auth.guard';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';
import { makePrismaMock } from '../../mocks/services/prisma.mock';

describe('JwtAuthGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;
  const jwt = {
    verify: jest.fn(),
  } as unknown as JwtService;
  let prismaMock: ReturnType<typeof makePrismaMock>;
  let guard: JwtAuthGuard;

  const contextFor = (request: Record<string, unknown>) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    prismaMock = makePrismaMock();
    guard = new JwtAuthGuard(
      reflector,
      jwt,
      prismaMock as unknown as PrismaService,
    );
    jest.clearAllMocks();
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
  });

  it('aceita um token de cliente com sessão atual', async () => {
    const request = { headers: { authorization: 'Bearer access-token' } };
    const payload = {
      sub: 'uuid-client-1',
      accountType: 'CLIENT',
      sessionVersion: 2,
    };
    (jwt.verify as jest.Mock).mockReturnValue(payload);
    prismaMock.client.findUnique.mockResolvedValue({
      active: true,
      user: { active: true, sessionVersion: 2 },
    });

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request['user']).toEqual({
      ...payload,
      role: 'CLIENT',
      roles: ['CLIENT'],
    });
  });

  it('usa todos os papéis válidos atuais do usuário, sem confiar nos claims antigos', async () => {
    const request = { headers: { authorization: 'Bearer access-token' } };
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: 'uuid-user-1',
      accountType: 'USER',
      role: 'CLIENT',
      roles: ['CLIENT'],
      sessionVersion: 2,
    });
    prismaMock.user.findUnique.mockResolvedValue({
      active: true,
      sessionVersion: 2,
      role: 'ADMIN',
      roleAssignments: [{ role: 'ADMIN' }, { role: 'PROFESSIONAL' }],
    });

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request['user']).toEqual({
      sub: 'uuid-user-1',
      accountType: 'USER',
      sessionVersion: 2,
      role: 'ADMIN',
      roles: ['ADMIN', 'PROFESSIONAL'],
    });
  });

  it('mantém o papel legado quando a relação de papéis está vazia ou malformada', async () => {
    const request = { headers: { authorization: 'Bearer access-token' } };
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: 'uuid-user-1',
      accountType: 'USER',
      sessionVersion: 2,
    });
    prismaMock.user.findUnique.mockResolvedValue({
      active: true,
      sessionVersion: 2,
      role: 'ADMIN',
      roleAssignments: [{ role: undefined }],
    } as never);

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request['user']).toEqual({
      sub: 'uuid-user-1',
      accountType: 'USER',
      sessionVersion: 2,
      role: 'ADMIN',
      roles: ['ADMIN'],
    });
  });

  it('nunca expõe papel indefinido quando o registro legado também estiver inválido', async () => {
    const request = { headers: { authorization: 'Bearer access-token' } };
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: 'uuid-user-1',
      accountType: 'USER',
      sessionVersion: 2,
    });
    prismaMock.user.findUnique.mockResolvedValue({
      active: true,
      sessionVersion: 2,
      role: undefined,
      roleAssignments: [{ role: undefined }],
    } as never);

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request['user']).toEqual({
      sub: 'uuid-user-1',
      accountType: 'USER',
      sessionVersion: 2,
      roles: [],
    });
  });

  it('rejeita imediatamente um token emitido antes da revogação da sessão', async () => {
    const request = { headers: { authorization: 'Bearer access-token' } };
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: 'uuid-client-1',
      accountType: 'CLIENT',
      sessionVersion: 1,
    });
    prismaMock.client.findUnique.mockResolvedValue({
      active: true,
      user: { active: true, sessionVersion: 2 },
    });

    await expect(guard.canActivate(contextFor(request))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
