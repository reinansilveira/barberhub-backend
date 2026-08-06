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
  USER_COM_RESET_CODE_STUB,
  USER_COM_RESET_CODE_EXPIRADO_STUB,
} from '../../mocks/stubs/user.stub';

jest.mock('bcrypt');
const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>;

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
      });
    });

    it('busca usuários inativos quando active é "false"', () => {
      prismaMock.user.findMany.mockResolvedValue([]);

      service.findAll('false');

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: { active: false },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('busca usuários ativos para qualquer valor diferente de "false"', () => {
      prismaMock.user.findMany.mockResolvedValue([USER_STUB]);

      service.findAll('true');

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findById', () => {
    it('busca o usuário pelo id exato', async () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_STUB);

      await service.findById('uuid-user-123');

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-user-123' },
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

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'uuid-user-123' },
        data: expect.objectContaining({ password: '$2b$10$novoHashAqui' }),
      });
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
        data: { active: false },
      });
    });

    it('retorna o resultado do update', async () => {
      const usuarioDesativado = { ...USER_STUB, active: false };
      prismaMock.user.update.mockResolvedValue(usuarioDesativado);

      const result = await service.deactivate('uuid-user-123');

      expect(result).toEqual(usuarioDesativado);
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

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'uuid-user-123' },
        data: { password: '$2b$10$novaSenhaHash' },
      });
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

  describe('forgotPassword', () => {
    const setupHappyPath = () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_STUB);
      prismaMock.user.update.mockResolvedValue(USER_STUB);
      emailMock.sendResetCode.mockResolvedValue(undefined);
    };

    it('busca o usuário pelo email', async () => {
      setupHappyPath();
      const dto = makeForgotPasswordDto();

      await service.forgotPassword(dto);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: dto.email },
      });
    });

    it('salva o código de reset e o prazo de expiração no banco', async () => {
      setupHappyPath();

      await service.forgotPassword(makeForgotPasswordDto());

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { email: USER_STUB.email },
        data: {
          resetCode: expect.stringMatching(/^\d{6}$/),
          resetCodeExpires: expect.any(Date),
        },
      });
    });

    it('gera um código de 6 dígitos numéricos', async () => {
      setupHappyPath();

      await service.forgotPassword(makeForgotPasswordDto());

      const chamada = prismaMock.user.update.mock.calls[0][0];
      const codigo = chamada.data.resetCode;

      expect(codigo).toMatch(/^\d{6}$/);
    });

    it('define expiração de 15 minutos a partir de agora', async () => {
      setupHappyPath();
      const antes = Date.now();

      await service.forgotPassword(makeForgotPasswordDto());

      const depois = Date.now();
      const chamada = prismaMock.user.update.mock.calls[0][0];
      const expiracao = chamada.data.resetCodeExpires.getTime();
      const quinzeMinutos = 15 * 60 * 1000;

      expect(expiracao).toBeGreaterThanOrEqual(antes + quinzeMinutos);
      expect(expiracao).toBeLessThanOrEqual(depois + quinzeMinutos);
    });

    it('envia o email com o código para o endereço correto', async () => {
      setupHappyPath();

      await service.forgotPassword(makeForgotPasswordDto());

      const chamada = prismaMock.user.update.mock.calls[0][0];
      const codigoSalvo = chamada.data.resetCode;

      expect(emailMock.sendResetCode).toHaveBeenCalledWith(
        USER_STUB.email,
        codigoSalvo,
      );
    });

    it('retorna mensagem de confirmação', async () => {
      setupHappyPath();

      const result = await service.forgotPassword(makeForgotPasswordDto());

      expect(result).toEqual({ message: 'E-mail enviado' });
    });

    it('lança BadRequestException quando o email não está cadastrado', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.forgotPassword(makeForgotPasswordDto()),
      ).rejects.toThrow(BadRequestException);
    });

    it('não envia email quando o usuário não existe', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await service.forgotPassword(makeForgotPasswordDto()).catch(() => {});

      expect(emailMock.sendResetCode).not.toHaveBeenCalled();
    });
  });


  describe('verifyCode', () => {
    it('retorna mensagem de sucesso com código válido e dentro do prazo', async () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_COM_RESET_CODE_STUB);

      const result = await service.verifyCode(makeVerifyCodeDto());

      expect(result).toEqual({ message: 'Código válido.' });
    });

    it('lança BadRequestException quando o usuário não existe', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.verifyCode(makeVerifyCodeDto())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lança BadRequestException quando o código está errado', async () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_COM_RESET_CODE_STUB);

      await expect(
        service.verifyCode(makeVerifyCodeDto({ code: '000000' })),
      ).rejects.toThrow(BadRequestException);
    });

    it('lança BadRequestException quando o código expirou', async () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_COM_RESET_CODE_EXPIRADO_STUB);

      await expect(service.verifyCode(makeVerifyCodeDto())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lança BadRequestException quando resetCodeExpires é nulo', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...USER_COM_RESET_CODE_STUB,
        resetCodeExpires: null,
      });

      await expect(service.verifyCode(makeVerifyCodeDto())).rejects.toThrow(
        BadRequestException,
      );
    });
  });


  describe('resetPassword', () => {
    const setupHappyPath = () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_COM_RESET_CODE_STUB);
      bcryptMock.hash.mockResolvedValue('$2b$10$senhaResetadaHash' as never);
      prismaMock.user.update.mockResolvedValue(USER_STUB);
    };

    it('faz hash da nova senha antes de salvar', async () => {
      setupHappyPath();
      const dto = makeResetPasswordDto();

      await service.resetPassword(dto);

      expect(bcryptMock.hash).toHaveBeenCalledWith(dto.newPassword, 10);
    });

    it('salva a nova senha e limpa os campos de reset', async () => {
      setupHappyPath();

      await service.resetPassword(makeResetPasswordDto());

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { email: USER_COM_RESET_CODE_STUB.email },
        data: {
          password: '$2b$10$senhaResetadaHash',
          resetCode: null,
          resetCodeExpires: null,
        },
      });
    });

    it('retorna mensagem de sucesso', async () => {
      setupHappyPath();

      const result = await service.resetPassword(makeResetPasswordDto());

      expect(result).toEqual({ message: 'Senha redefinida com sucesso.' });
    });

    it('lança BadRequestException quando o usuário não existe', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.resetPassword(makeResetPasswordDto())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lança BadRequestException quando o código está errado', async () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_COM_RESET_CODE_STUB);

      await expect(
        service.resetPassword(makeResetPasswordDto({ code: '000000' })),
      ).rejects.toThrow(BadRequestException);
    });

    it('lança BadRequestException quando o código expirou', async () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_COM_RESET_CODE_EXPIRADO_STUB);

      await expect(service.resetPassword(makeResetPasswordDto())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('não atualiza a senha quando o código está errado', async () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_COM_RESET_CODE_STUB);

      await service.resetPassword(makeResetPasswordDto({ code: '000000' })).catch(() => {});

      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('não atualiza a senha quando o código expirou', async () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_COM_RESET_CODE_EXPIRADO_STUB);

      await service.resetPassword(makeResetPasswordDto()).catch(() => {});

      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });
  });
});
