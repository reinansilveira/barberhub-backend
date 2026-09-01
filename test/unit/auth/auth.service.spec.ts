import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { AuthService } from '../../../src/modules/auth/auth.service';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';
import { NotificationSenderService } from '../../../src/modules/notifications/sender/notification-sender.service';
import { ClientMapper } from '../../../src/modules/auth/mappers/client.mapper';

import { makePrismaMock } from '../../mocks/services/prisma.mock';
import { makeRedisMock } from '../../mocks/services/redis.mock';
import { makeJwtMock } from '../../mocks/services/jwt.mock';
import { makeNotificationMock } from '../../mocks/services/notification.mock';

import {
  makeLoginDto,
  makeStartDto,
  makeVerifyCodeDto,
} from '../../mocks/factories/auth.factory';
import { USER_STUB } from '../../mocks/stubs/user.stub';
import {
  CLIENT_STUB,
  VERIFY_CODE_RESPONSE_STUB,
} from '../../mocks/stubs/client.stub';
import { TOKEN_PAIR_STUB } from '../../mocks/stubs/token.stub';

jest.mock('bcrypt');
const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>;

jest.mock('../../../src/modules/auth/mappers/client.mapper');
const ClientMapperMock = ClientMapper as jest.Mocked<typeof ClientMapper>;

describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: ReturnType<typeof makePrismaMock>;
  let jwtMock: ReturnType<typeof makeJwtMock>;
  let redisMock: ReturnType<typeof makeRedisMock>;
  let notificationMock: ReturnType<typeof makeNotificationMock>;

  beforeEach(async () => {
    prismaMock = makePrismaMock();
    jwtMock = makeJwtMock();
    redisMock = makeRedisMock();
    notificationMock = makeNotificationMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtMock },
        { provide: 'REDIS', useValue: redisMock },
        { provide: NotificationSenderService, useValue: notificationMock },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  it('deve ser instanciado corretamente', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const setupHappyPath = () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_STUB);
      bcryptMock.compare.mockResolvedValue(true as never);
      jwtMock.sign
        .mockReturnValueOnce(TOKEN_PAIR_STUB.access_token)
        .mockReturnValueOnce(TOKEN_PAIR_STUB.refresh_token);
      redisMock.set.mockResolvedValue('OK');
    };

    it('busca o usuário pelo email exato fornecido no DTO', async () => {
      setupHappyPath();
      const dto = makeLoginDto();

      await service.login(dto);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: dto.email },
      });
    });

    it('compara a senha fornecida com o hash armazenado', async () => {
      setupHappyPath();
      const dto = makeLoginDto();

      await service.login(dto);

      expect(bcryptMock.compare).toHaveBeenCalledWith(
        dto.password,
        USER_STUB.password,
      );
    });

    it('retorna access_token e refresh_token no caminho feliz', async () => {
      setupHappyPath();

      const result = await service.login(makeLoginDto());

      expect(result).toEqual(TOKEN_PAIR_STUB);
    });

    it('persiste o hash do refresh_token no Redis com TTL de 7 dias', async () => {
      setupHappyPath();

      await service.login(makeLoginDto());

      expect(redisMock.set).toHaveBeenCalledWith(
        expect.stringMatching(/^refresh:uuid-user-123:/),
        '1',
        'EX',
        60 * 60 * 24 * 7,
      );
    });

    it('lança UnauthorizedException quando o usuário não existe', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.login(makeLoginDto())).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lança UnauthorizedException quando o usuário está inativo', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...USER_STUB,
        active: false,
      });

      await expect(service.login(makeLoginDto())).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lança UnauthorizedException quando a senha está errada', async () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_STUB);
      bcryptMock.compare.mockResolvedValue(false as never);

      await expect(service.login(makeLoginDto())).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('não vaza qual campo está errado na mensagem de erro (segurança)', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      const errorWhenNoUser = await service
        .login(makeLoginDto())
        .catch((e) => e);

      prismaMock.user.findUnique.mockResolvedValue(USER_STUB);
      bcryptMock.compare.mockResolvedValue(false as never);
      const errorWhenWrongPass = await service
        .login(makeLoginDto())
        .catch((e) => e);

      expect(errorWhenNoUser.message).toBe(errorWhenWrongPass.message);
    });
  });

  describe('refresh', () => {
    const PAYLOAD_STUB = { sub: USER_STUB.id, email: USER_STUB.email };

    const setupHappyPath = () => {
      jwtMock.verify.mockReturnValue(PAYLOAD_STUB);
      redisMock.get.mockResolvedValue('1');
      redisMock.del.mockResolvedValue(1);
      prismaMock.user.findUnique.mockResolvedValue(USER_STUB);
      jwtMock.sign
        .mockReturnValueOnce(TOKEN_PAIR_STUB.access_token)
        .mockReturnValueOnce(TOKEN_PAIR_STUB.refresh_token);
      redisMock.set.mockResolvedValue('OK');
    };

    it('verifica o refresh token com o secret correto', async () => {
      setupHappyPath();

      await service.refresh('some.refresh.token');

      expect(jwtMock.verify).toHaveBeenCalledWith('some.refresh.token', {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    });

    it('consulta o Redis com a chave composta por userId + hash do token', async () => {
      setupHappyPath();

      await service.refresh('some.refresh.token');

      expect(redisMock.get).toHaveBeenCalledWith(
        expect.stringMatching(`^refresh:${USER_STUB.id}:`),
      );
    });

    it('invalida o refresh token usado (rotação de tokens)', async () => {
      setupHappyPath();

      await service.refresh('some.refresh.token');

      expect(redisMock.del).toHaveBeenCalledWith(
        expect.stringMatching(`^refresh:${USER_STUB.id}:`),
      );
    });

    it('retorna novo par de tokens no caminho feliz', async () => {
      setupHappyPath();

      const result = await service.refresh('some.refresh.token');

      expect(result).toEqual(TOKEN_PAIR_STUB);
    });

    it('lança UnauthorizedException quando o token não está no Redis', async () => {
      jwtMock.verify.mockReturnValue(PAYLOAD_STUB);
      redisMock.get.mockResolvedValue(null);

      await expect(
        service.refresh('token.valido.mas.nao.no.redis'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lança UnauthorizedException quando o usuário foi desativado', async () => {
      jwtMock.verify.mockReturnValue(PAYLOAD_STUB);
      redisMock.get.mockResolvedValue('1');
      redisMock.del.mockResolvedValue(1);
      prismaMock.user.findUnique.mockResolvedValue({
        ...USER_STUB,
        active: false,
      });

      await expect(service.refresh('valid.token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lança UnauthorizedException quando o JWT está malformado', async () => {
      jwtMock.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      await expect(service.refresh('token.lixo')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validate', () => {
    const PAYLOAD_STUB = { sub: USER_STUB.id, email: USER_STUB.email };

    it('verifica o token com o JWT_SECRET correto', async () => {
      jwtMock.verify.mockReturnValue(PAYLOAD_STUB);
      prismaMock.user.findUnique.mockResolvedValue(USER_STUB);

      await service.validate('some.access.token');

      expect(jwtMock.verify).toHaveBeenCalledWith('some.access.token', {
        secret: process.env.JWT_SECRET,
      });
    });

    it('retorna valid:true e dados do usuário para token legítimo', async () => {
      jwtMock.verify.mockReturnValue(PAYLOAD_STUB);
      prismaMock.user.findUnique.mockResolvedValue(USER_STUB);

      const result = await service.validate('valid.token');

      expect(result).toEqual({
        valid: true,
        user: { id: USER_STUB.id, email: USER_STUB.email },
      });
    });

    it('lança UnauthorizedException quando o usuário não existe mais no banco', async () => {
      jwtMock.verify.mockReturnValue(PAYLOAD_STUB);
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.validate('valid.token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lança UnauthorizedException quando o usuário foi desativado', async () => {
      jwtMock.verify.mockReturnValue(PAYLOAD_STUB);
      prismaMock.user.findUnique.mockResolvedValue({
        ...USER_STUB,
        active: false,
      });

      await expect(service.validate('valid.token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lança UnauthorizedException para token com assinatura inválida', async () => {
      jwtMock.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await expect(service.validate('token.adulterado')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('start', () => {
    const setupHappyPath = () => {
      prismaMock.client.findFirst.mockResolvedValue(CLIENT_STUB);
      redisMock.incr.mockResolvedValue(1);
      redisMock.expire.mockResolvedValue(1);
      bcryptMock.hash.mockResolvedValue('$2b$10$otpHashAqui' as never);
      redisMock.set.mockResolvedValue('OK');
      notificationMock.sendWhatsApp.mockResolvedValue(undefined);
    };

    it('busca o cliente pelo telefone exato do DTO', async () => {
      setupHappyPath();
      const dto = makeStartDto();

      await service.start(dto);

      expect(prismaMock.client.findFirst).toHaveBeenCalledWith({
        where: {
          active: true,
          user: { is: { phone: dto.phone, active: true } },
        },
      });
    });

    it('persiste o hash do OTP no Redis com TTL de 300 segundos', async () => {
      setupHappyPath();

      await service.start(makeStartDto());

      expect(redisMock.set).toHaveBeenCalledWith(
        `otp:${makeStartDto().phone}`,
        expect.stringContaining('"code"'),
        'EX',
        300,
      );
    });

    it('envia o OTP via WhatsApp para o telefone correto', async () => {
      setupHappyPath();
      const dto = makeStartDto();

      await service.start(dto);

      expect(notificationMock.sendWhatsApp).toHaveBeenCalledWith(
        dto.phone,
        expect.stringContaining('código'),
      );
    });

    it('retorna clientId e mensagem de confirmação', async () => {
      setupHappyPath();

      const result = await service.start(makeStartDto());

      expect(result).toEqual({
        clientId: CLIENT_STUB.id,
        message: 'Código enviado',
      });
    });

    it('lança BadRequestException quando o cliente não existe', async () => {
      prismaMock.client.findFirst.mockResolvedValue(null);

      await expect(service.start(makeStartDto())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lança UnauthorizedException após 3 tentativas de OTP no mesmo telefone', async () => {
      prismaMock.client.findFirst.mockResolvedValue(CLIENT_STUB);
      redisMock.incr.mockResolvedValue(4);

      await expect(service.start(makeStartDto())).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('define TTL de rate-limit de 15 minutos na primeira tentativa', async () => {
      setupHappyPath();
      redisMock.incr.mockResolvedValue(1);

      await service.start(makeStartDto());

      expect(redisMock.expire).toHaveBeenCalledWith(
        `otp:rate:${makeStartDto().phone}`,
        60 * 15,
      );
    });

    it('não chama expire nas tentativas subsequentes', async () => {
      setupHappyPath();
      redisMock.incr.mockResolvedValue(2);

      await service.start(makeStartDto());

      expect(redisMock.expire).not.toHaveBeenCalled();
    });
  });

  describe('verifyCode', () => {
    const makeOtpPayload = (overrides?: {
      expiresAt?: number;
      code?: string;
    }) =>
      JSON.stringify({
        code: '$2b$10$otpHashAqui',
        expiresAt: Date.now() + 5 * 60 * 1000,
        ...overrides,
      });

    const setupHappyPath = () => {
      redisMock.get.mockResolvedValue(makeOtpPayload());
      bcryptMock.compare.mockResolvedValue(true as never);
      redisMock.del.mockResolvedValue(1);
      prismaMock.client.findFirst.mockResolvedValue(CLIENT_STUB);
      prismaMock.client.update.mockResolvedValue(CLIENT_STUB);
      ClientMapperMock.toVerifyCodeResponse.mockReturnValue(
        VERIFY_CODE_RESPONSE_STUB,
      );
    };

    it('busca o OTP no Redis pela chave do telefone', async () => {
      setupHappyPath();
      const dto = makeVerifyCodeDto();

      await service.verifyCode(dto);

      expect(redisMock.get).toHaveBeenCalledWith(`otp:${dto.phone}`);
    });

    it('compara o código fornecido com o hash armazenado', async () => {
      setupHappyPath();
      const dto = makeVerifyCodeDto();

      await service.verifyCode(dto);

      expect(bcryptMock.compare).toHaveBeenCalledWith(
        dto.code,
        '$2b$10$otpHashAqui',
      );
    });

    it('deleta o OTP do Redis após verificação bem-sucedida (uso único)', async () => {
      setupHappyPath();

      await service.verifyCode(makeVerifyCodeDto());

      expect(redisMock.del).toHaveBeenCalledWith(
        `otp:${makeVerifyCodeDto().phone}`,
      );
    });

    it('marca o telefone como verificado no banco (phoneVerifiedAt)', async () => {
      setupHappyPath();

      await service.verifyCode(makeVerifyCodeDto());

      expect(prismaMock.client.update).toHaveBeenCalledWith({
        where: { id: CLIENT_STUB.id },
        data: { phoneVerifiedAt: expect.any(Date) },
        include: { user: true },
      });
    });

    it('retorna os dados mapeados pelo ClientMapper', async () => {
      setupHappyPath();

      const result = await service.verifyCode(makeVerifyCodeDto());

      expect(result).toEqual(VERIFY_CODE_RESPONSE_STUB);
    });

    it('lança BadRequestException quando o OTP não existe no Redis', async () => {
      redisMock.get.mockResolvedValue(null);

      await expect(service.verifyCode(makeVerifyCodeDto())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lança BadRequestException quando o OTP expirou pelo timestamp', async () => {
      redisMock.get.mockResolvedValue(
        makeOtpPayload({ expiresAt: Date.now() - 1000 }),
      );

      await expect(service.verifyCode(makeVerifyCodeDto())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lança BadRequestException quando o código está incorreto', async () => {
      redisMock.get.mockResolvedValue(makeOtpPayload());
      bcryptMock.compare.mockResolvedValue(false as never);

      await expect(service.verifyCode(makeVerifyCodeDto())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('não deleta o OTP do Redis quando o código está incorreto', async () => {
      redisMock.get.mockResolvedValue(makeOtpPayload());
      bcryptMock.compare.mockResolvedValue(false as never);

      await service.verifyCode(makeVerifyCodeDto()).catch(() => {});

      expect(redisMock.del).not.toHaveBeenCalled();
    });
  });
});
