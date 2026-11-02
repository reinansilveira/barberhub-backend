import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { ClientController } from '../../../src/modules/clients/client.controller';
import { ClientService } from '../../../src/modules/clients/client.service';
import { CLIENT_RESPONSE_STUB, CLIENT_STUB } from '../../mocks/stubs/client.stub';

describe('ClientController', () => {
  const clientService = {
    findById: jest.fn(),
  } as unknown as ClientService;
  const controller = new ClientController(clientService);

  beforeEach(() => {
    jest.clearAllMocks();
    (clientService.findById as jest.Mock).mockResolvedValue(CLIENT_RESPONSE_STUB);
  });

  it('permite o cliente acessar somente o próprio cadastro', async () => {
    const request = {
      user: { sub: CLIENT_STUB.id, accountType: 'CLIENT', role: UserRole.CLIENT },
    } as unknown as Request;

    await expect(
      controller.findById(CLIENT_STUB.id, request),
    ).resolves.toEqual(CLIENT_RESPONSE_STUB);
  });

  it('bloqueia um cliente ao tentar acessar dados de outro cliente', () => {
    const request = {
      user: { sub: 'outro-cliente', accountType: 'CLIENT', role: UserRole.CLIENT },
    } as unknown as Request;

    expect(() => controller.findById(CLIENT_STUB.id, request)).toThrow(
      ForbiddenException,
    );
  });

  it('mantém o acesso administrativo necessário aos cadastros', async () => {
    const request = {
      user: {
        sub: 'uuid-admin',
        accountType: 'USER',
        role: UserRole.CLIENT,
        roles: [UserRole.ADMIN, UserRole.PROFESSIONAL],
      },
    } as unknown as Request;

    await expect(
      controller.findById(CLIENT_STUB.id, request),
    ).resolves.toEqual(CLIENT_RESPONSE_STUB);
  });
});
