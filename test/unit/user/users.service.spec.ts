import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../../../src/modules/users/users.service';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';
import { EmailService } from '../../../src/shared/email/email.service';

import { makePrismaMock } from '../../mocks/services/prisma.mock';
import { makeEmailMock } from '../../mocks/services/email.mock';
import {
  makeCreateUserDto,
  makeForgotPasswordDto,
  makeVerifyCodeDto,
  makeResetPasswordDto,
  makeUpdatePasswordDto,
} from '../../mocks/factories/user.factory';
import {
  USER_STUB,
  USER_PROFISSIONAL_STUB,
} from '../../mocks/stubs/user.stub';

jest.mock('bcrypt');
const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>;

const USER_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatar: true,
  gender: true,
  role: true,
  active: true,
  emailVerified: true,
  twoFactorEnabled: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  roleAssignments: { select: { role: true } },
};

describe('UsersService', () => {
  let service: UsersService;
  let prismaMock: ReturnType<typeof makePrismaMock>;
  let emailMock: ReturnType<typeof makeEmailMock>;

  beforeEach(async () => {
    prismaMock = makePrismaMock();
    emailMock = makeEmailMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EmailService, useValue: emailMock },
      ],
    }).compile();

    service = module.get(UsersService);
    jest.clearAllMocks();
  });

  it('deve ser instanciado corretamente', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('busca usuários ativos por padrão quando active não é informado', () => {
      prismaMock.user.findMany.mockResolvedValue([USER_STUB]);

      service.findAll();

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { createdAt: 'desc' },
        select: USER_SAFE_SELECT,
      });
    });

    it('busca usuários inativos quando active é "false"', () => {
      prismaMock.user.findMany.mockResolvedValue([]);

      service.findAll('false');

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: { active: false },
        orderBy: { createdAt: 'desc' },
        select: USER_SAFE_SELECT,
      });
    });

    it('busca usuários ativos para qualquer valor diferente de "false"', () => {
      prismaMock.user.findMany.mockResolvedValue([USER_STUB]);

      service.findAll('true');

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { createdAt: 'desc' },
        select: USER_SAFE_SELECT,
      });
    });

    it('não seleciona senha, código de reset ou versão de sessão nas respostas', () => {
      prismaMock.user.findMany.mockResolvedValue([USER_STUB]);

      service.findAll();

      const { select } = prismaMock.user.findMany.mock.calls[0][0];
      expect(select).not.toHaveProperty('password');
      expect(select).not.toHaveProperty('resetCode');
      expect(select).not.toHaveProperty('resetCodeExpires');
      expect(select).not.toHaveProperty('sessionVersion');
    });
  });

  describe('findById', () => {
    it('busca o usuário pelo id exato', async () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_STUB);

      await service.findById('uuid-user-123');

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-user-123' },
        select: USER_SAFE_SELECT,
      });
    });

    it('retorna o usuário quando existe', async () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_STUB);

      const result = await service.findById('uuid-user-123');

      expect(result).toEqual(USER_STUB);
    });

    it('lança BadRequestException quando o usuário não existe', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('id-inexistente')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('create', () => {
    const setupHappyPath = () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      bcryptMock.hash.mockResolvedValue('$2b$10$novoHashAqui' as never);
      prismaMock.user.create.mockResolvedValue(USER_STUB);
    };

    it('verifica se o email já existe antes de criar', async () => {
      setupHappyPath();
      const dto = makeCreateUserDto();

      await service.create(dto);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: dto.email },
      });
    });

    it('faz hash da senha antes de salvar', async () => {
      setupHappyPath();
      const dto = makeCreateUserDto();

      await service.create(dto);

      expect(bcryptMock.hash).toHaveBeenCalledWith(dto.password, 10);
    });

    it('salva o usuário com a senha hasheada, não a senha original', async () => {
      setupHappyPath();
      const dto = makeCreateUserDto();

      await service.create(dto);

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ password: '$2b$10$novoHashAqui' }),
        select: USER_SAFE_SELECT,
      });
    });

    it('nunca salva a senha em texto puro', async () => {
      setupHappyPath();
      const dto = makeCreateUserDto();

      await service.create(dto);

      const chamada = prismaMock.user.create.mock.calls[0][0];
      expect(chamada.data.password).not.toBe(dto.password);
    });

    it('lança ConflictException quando o email já está cadastrado', async () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_STUB);

      await expect(service.create(makeCreateUserDto())).rejects.toThrow(
        ConflictException,
      );
    });

    it('lança ConflictException quando o telefone já está cadastrado', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(USER_STUB);

      await expect(
        service.create(makeCreateUserDto({ phone: '+5579999999999' })),
      ).rejects.toThrow(ConflictException);
    });

    it('não cria o usuário quando o email já existe', async () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_STUB);

      await service.create(makeCreateUserDto()).catch(() => {});

      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const setupHappyPath = () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_STUB);
      bcryptMock.hash.mockResolvedValue('$2b$10$novoHashAqui' as never);
      prismaMock.user.update.mockResolvedValue(USER_STUB);
    };

    it('verifica se o usuário existe antes de atualizar', async () => {
      setupHappyPath();

      await service.update('uuid-user-123', makeCreateUserDto());

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-user-123' },
        select: USER_SAFE_SELECT,
      });
    });

    it('faz hash da nova senha antes de salvar', async () => {
      setupHappyPath();
      const dto = makeCreateUserDto({ password: 'NovaSenha@456' });

      await service.update('uuid-user-123', dto);

      expect(bcryptMock.hash).toHaveBeenCalledWith('NovaSenha@456', 10);
    });

    it('salva o usuário com a senha hasheada', async () => {
      setupHappyPath();

      await service.update('uuid-user-123', makeCreateUserDto());

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'uuid-user-123' },
          data: expect.objectContaining({ password: '$2b$10$novoHashAqui' }),
          select: USER_SAFE_SELECT,
        }),
      );
    });

    it('lança BadRequestException quando o usuário não existe', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.update('id-inexistente', makeCreateUserDto()),
      ).rejects.toThrow(BadRequestException);
    });

    it('não chama update quando o usuário não existe', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await service.update('id-inexistente', makeCreateUserDto()).catch(() => {});

      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('lança ConflictException quando o telefone já está cadastrado em outro usuário', async () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_STUB);
      prismaMock.user.findFirst.mockResolvedValue(USER_PROFISSIONAL_STUB as any);

      await expect(
        service.update('uuid-user-123', makeCreateUserDto({ phone: '+5579999999999' })),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deactivate', () => {
    it('desativa o usuário definindo active como false', () => {
      prismaMock.user.update.mockResolvedValue({ ...USER_STUB, active: false });

      service.deactivate('uuid-user-123');

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'uuid-user-123' },
        data: { active: false, sessionVersion: { increment: 1 } },
        select: USER_SAFE_SELECT,
      });
    });

    it('retorna o resultado do update', async () => {
      const usuarioDesativado = { ...USER_STUB, active: false };
      prismaMock.user.update.mockResolvedValue(usuarioDesativado);

      const result = await service.deactivate('uuid-user-123');

      expect(result).toEqual(usuarioDesativado);
    });
  });

  describe('updateAvatar', () => {
    it('atualiza somente o avatar do próprio usuário e retorna campos seguros', async () => {
      const avatar = 'data:image/jpeg;base64,avatar-comprimido';
      const expected = { id: 'uuid-user-123', avatar };
      prismaMock.user.update.mockResolvedValue(expected as never);

      await expect(
        service.updateAvatar('uuid-user-123', { avatar }),
      ).resolves.toEqual(expected);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'uuid-user-123' },
        data: { avatar },
        select: { id: true, avatar: true },
      });
    });
  });

  describe('updatePassword', () => {
    const setupHappyPath = () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_STUB);
      bcryptMock.compare.mockResolvedValue(true as never);
      bcryptMock.hash.mockResolvedValue('$2b$10$novaSenhaHash' as never);
      prismaMock.user.update.mockResolvedValue(USER_STUB);
    };

    it('verifica se a senha atual está correta', async () => {
      setupHappyPath();
      const dto = makeUpdatePasswordDto();

      await service.updatePassword('uuid-user-123', dto);

      expect(bcryptMock.compare).toHaveBeenCalledWith(
        dto.currentPassword,
        USER_STUB.password,
      );
    });

    it('faz hash da nova senha antes de salvar', async () => {
      setupHappyPath();
      const dto = makeUpdatePasswordDto();

      await service.updatePassword('uuid-user-123', dto);

      expect(bcryptMock.hash).toHaveBeenCalledWith(dto.newPassword, 10);
    });

    it('salva a nova senha hasheada', async () => {
      setupHappyPath();

      await service.updatePassword('uuid-user-123', makeUpdatePasswordDto());

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'uuid-user-123' },
          data: expect.objectContaining({
            password: '$2b$10$novaSenhaHash',
            sessionVersion: { increment: 1 },
          }),
          select: USER_SAFE_SELECT,
        }),
      );
    });

    it('lança BadRequestException quando a senha atual está errada', async () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_STUB);
      bcryptMock.compare.mockResolvedValue(false as never);

      await expect(
        service.updatePassword('uuid-user-123', makeUpdatePasswordDto()),
      ).rejects.toThrow(BadRequestException);
    });

    it('não atualiza a senha quando a atual está errada', async () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_STUB);
      bcryptMock.compare.mockResolvedValue(false as never);

      await service.updatePassword('uuid-user-123', makeUpdatePasswordDto()).catch(() => {});

      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('lança BadRequestException quando o usuário não existe', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePassword('id-inexistente', makeUpdatePasswordDto()),
      ).rejects.toThrow(BadRequestException);
    });
  });

  const resetToken = {
    id: 'reset-token-1',
    userId: USER_STUB.id,
    codeHash: '$2b$10$resetCodeHash',
    attempts: 0,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    consumedAt: null,
    createdAt: new Date(),
  };

  describe('forgotPassword', () => {
    const setupHappyPath = () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_STUB);
      prismaMock.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.passwordResetToken.create.mockResolvedValue(resetToken);
      bcryptMock.hash.mockResolvedValue('$2b$10$resetCodeHash' as never);
      emailMock.sendResetCode.mockResolvedValue(undefined);
    };

    it('invalida códigos pendentes e salva apenas o hash do novo código', async () => {
      setupHappyPath();

      await service.forgotPassword(makeForgotPasswordDto());

      expect(prismaMock.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: { userId: USER_STUB.id, consumedAt: null },
        data: { consumedAt: expect.any(Date) },
      });
      expect(prismaMock.passwordResetToken.create).toHaveBeenCalledWith({
        data: {
          userId: USER_STUB.id,
          codeHash: '$2b$10$resetCodeHash',
          expiresAt: expect.any(Date),
        },
      });
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('gera um código de seis dígitos, envia-o ao e-mail e oculta o resultado', async () => {
      setupHappyPath();

      const result = await service.forgotPassword(makeForgotPasswordDto());

      const code = bcryptMock.hash.mock.calls[0][0] as string;
      expect(code).toMatch(/^\d{6}$/);
      expect(emailMock.sendResetCode).toHaveBeenCalledWith(USER_STUB.email, code);
      expect(result).toEqual({
        message: 'Se houver uma conta, enviaremos as instruções.',
      });
    });

    it('não revela se o e-mail não existe', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.forgotPassword(makeForgotPasswordDto())).resolves.toEqual({
        message: 'Se houver uma conta, enviaremos as instruções.',
      });
      expect(prismaMock.passwordResetToken.create).not.toHaveBeenCalled();
      expect(emailMock.sendResetCode).not.toHaveBeenCalled();
    });
  });

  describe('verifyCode', () => {
    const setupValidToken = () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_STUB);
      prismaMock.passwordResetToken.findFirst.mockResolvedValue(resetToken);
      bcryptMock.compare.mockResolvedValue(true as never);
    };

    it('aceita somente um token não consumido, dentro do prazo e com hash válido', async () => {
      setupValidToken();

      await expect(service.verifyCode(makeVerifyCodeDto())).resolves.toEqual({
        message: 'Código válido.',
      });
      expect(prismaMock.passwordResetToken.findFirst).toHaveBeenCalledWith({
        where: {
          userId: USER_STUB.id,
          consumedAt: null,
          expiresAt: { gt: expect.any(Date) },
          attempts: { lt: 5 },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('incrementa tentativas sem revelar se o código está incorreto', async () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_STUB);
      prismaMock.passwordResetToken.findFirst.mockResolvedValue(resetToken);
      bcryptMock.compare.mockResolvedValue(false as never);

      await expect(
        service.verifyCode(makeVerifyCodeDto({ code: '000000' })),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: resetToken.id },
        data: { attempts: { increment: 1 } },
      });
    });

    it('rejeita usuário ausente ou token expirado sem consultar hash', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.verifyCode(makeVerifyCodeDto())).rejects.toThrow(
        BadRequestException,
      );

      prismaMock.user.findUnique.mockResolvedValue(USER_STUB);
      prismaMock.passwordResetToken.findFirst.mockResolvedValue(null);
      await expect(service.verifyCode(makeVerifyCodeDto())).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('resetPassword', () => {
    const setupHappyPath = () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_STUB);
      prismaMock.passwordResetToken.findFirst.mockResolvedValue(resetToken);
      prismaMock.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
      bcryptMock.compare.mockResolvedValue(true as never);
      bcryptMock.hash.mockResolvedValue('$2b$10$senhaResetadaHash' as never);
      prismaMock.user.update.mockResolvedValue(USER_STUB);
    };

    it('consome o token de forma atômica, atualiza o hash e invalida sessões', async () => {
      setupHappyPath();
      const dto = makeResetPasswordDto();

      await expect(service.resetPassword(dto)).resolves.toEqual({
        message: 'Senha redefinida com sucesso.',
      });
      expect(bcryptMock.hash).toHaveBeenCalledWith(dto.newPassword, 10);
      expect(prismaMock.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: { id: resetToken.id, consumedAt: null },
        data: { consumedAt: expect.any(Date) },
      });
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: USER_STUB.id },
        data: {
          password: '$2b$10$senhaResetadaHash',
          passwordSetAt: expect.any(Date),
          mustChangePassword: false,
          sessionVersion: { increment: 1 },
          resetCode: null,
          resetCodeExpires: null,
        },
      });
    });

    it('não altera a senha se o token já foi consumido por outra requisição', async () => {
      setupHappyPath();
      prismaMock.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.resetPassword(makeResetPasswordDto())).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('não altera a senha quando o código é inválido ou expirado', async () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_STUB);
      prismaMock.passwordResetToken.findFirst.mockResolvedValue(resetToken);
      bcryptMock.compare.mockResolvedValue(false as never);

      await expect(
        service.resetPassword(makeResetPasswordDto({ code: '000000' })),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.user.update).not.toHaveBeenCalled();

      prismaMock.passwordResetToken.findFirst.mockResolvedValue(null);
      await expect(service.resetPassword(makeResetPasswordDto())).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
