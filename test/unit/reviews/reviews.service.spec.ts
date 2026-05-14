import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';

import { ReviewsService } from '../../../src/modules/reviews/reviews.service';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';

import { makePrismaMock } from '../../mocks/services/prisma.mock';
import { makeCreateReviewDto, makeRespondReviewDto } from '../../mocks/factories/review.factory';
import {
  APPOINTMENT_COMPLETED_STUB,
  APPOINTMENT_PENDING_STUB,
  REVIEW_STUB,
  REVIEW_COM_RESPOSTA_STUB,
} from '../../mocks/stubs/review.stub';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prismaMock: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prismaMock = makePrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(ReviewsService);
    jest.clearAllMocks();
  });

  it('deve ser instanciado corretamente', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('busca todas as reviews ordenadas por data decrescente', () => {
      prismaMock.review.findMany.mockResolvedValue([REVIEW_STUB]);

      service.findAll();

      expect(prismaMock.review.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });

    it('retorna a lista de reviews', async () => {
      prismaMock.review.findMany.mockResolvedValue([REVIEW_STUB]);

      const result = await service.findAll();

      expect(result).toEqual([REVIEW_STUB]);
    });

    it('retorna lista vazia quando não há reviews', async () => {
      prismaMock.review.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    const setupHappyPath = () => {
      prismaMock.appointment.findUnique.mockResolvedValue(APPOINTMENT_COMPLETED_STUB);
      prismaMock.review.findUnique.mockResolvedValue(null);
      prismaMock.review.create.mockResolvedValue(REVIEW_STUB);
    };

    it('busca o appointment pelo id do DTO', async () => {
      setupHappyPath();
      const dto = makeCreateReviewDto();

      await service.create(dto);

      expect(prismaMock.appointment.findUnique).toHaveBeenCalledWith({
        where: { id: dto.appointmentId },
      });
    });

    it('cria a review com os dados do appointment e do DTO', async () => {
      setupHappyPath();
      const dto = makeCreateReviewDto();

      await service.create(dto);

      expect(prismaMock.review.create).toHaveBeenCalledWith({
        data: {
          appointmentId: APPOINTMENT_COMPLETED_STUB.id,
          clientId: APPOINTMENT_COMPLETED_STUB.clientId,
          professionalId: APPOINTMENT_COMPLETED_STUB.professionalId,
          rating: dto.rating,
          comment: dto.comment,
        },
      });
    });

    it('retorna a review criada', async () => {
      setupHappyPath();

      const result = await service.create(makeCreateReviewDto());

      expect(result).toEqual(REVIEW_STUB);
    });

    it('cria review sem comment quando não é informado', async () => {
      setupHappyPath();

      await service.create(makeCreateReviewDto({ comment: undefined }));

      expect(prismaMock.review.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ comment: undefined }),
      });
    });

    it('lança BadRequestException quando o appointment não existe', async () => {
      prismaMock.appointment.findUnique.mockResolvedValue(null);

      await expect(service.create(makeCreateReviewDto())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lança BadRequestException quando o appointment não está finalizado', async () => {
      prismaMock.appointment.findUnique.mockResolvedValue(APPOINTMENT_PENDING_STUB);

      await expect(service.create(makeCreateReviewDto())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('não permite review em appointment cancelado', async () => {
      prismaMock.appointment.findUnique.mockResolvedValue({
        ...APPOINTMENT_COMPLETED_STUB,
        status: AppointmentStatus.CANCELLED,
      });

      await expect(service.create(makeCreateReviewDto())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lança ConflictException quando já existe review para este appointment', async () => {
      prismaMock.appointment.findUnique.mockResolvedValue(APPOINTMENT_COMPLETED_STUB);
      prismaMock.review.findUnique.mockResolvedValue(REVIEW_STUB);

      await expect(service.create(makeCreateReviewDto())).rejects.toThrow(
        ConflictException,
      );
    });

    it('não cria segunda review quando já existe uma para o appointment', async () => {
      prismaMock.appointment.findUnique.mockResolvedValue(APPOINTMENT_COMPLETED_STUB);
      prismaMock.review.findUnique.mockResolvedValue(REVIEW_STUB);

      await service.create(makeCreateReviewDto()).catch(() => {});

      expect(prismaMock.review.create).not.toHaveBeenCalled();
    });

    it('não cria review quando o appointment não existe', async () => {
      prismaMock.appointment.findUnique.mockResolvedValue(null);

      await service.create(makeCreateReviewDto()).catch(() => {});

      expect(prismaMock.review.create).not.toHaveBeenCalled();
    });

    it('verifica duplicidade pelo appointmentId correto', async () => {
      setupHappyPath();
      const dto = makeCreateReviewDto();

      await service.create(dto);

      expect(prismaMock.review.findUnique).toHaveBeenCalledWith({
        where: { appointmentId: dto.appointmentId },
      });
    });
  });

  describe('respond', () => {
    it('atualiza a review com a resposta e a data de resposta', async () => {
      prismaMock.review.update.mockResolvedValue(REVIEW_COM_RESPOSTA_STUB);
      const dto = makeRespondReviewDto();

      await service.respond('uuid-review-1', dto);

      expect(prismaMock.review.update).toHaveBeenCalledWith({
        where: { id: 'uuid-review-1' },
        data: {
          response: dto.response,
          respondedAt: expect.any(Date),
        },
      });
    });

    it('define respondedAt como a data atual', async () => {
      prismaMock.review.update.mockResolvedValue(REVIEW_COM_RESPOSTA_STUB);
      const antes = Date.now();

      await service.respond('uuid-review-1', makeRespondReviewDto());

      const depois = Date.now();
      const chamada = prismaMock.review.update.mock.calls[0][0];
      const respondedAt = chamada.data.respondedAt.getTime();

      expect(respondedAt).toBeGreaterThanOrEqual(antes);
      expect(respondedAt).toBeLessThanOrEqual(depois);
    });

    it('retorna a review com a resposta', async () => {
      prismaMock.review.update.mockResolvedValue(REVIEW_COM_RESPOSTA_STUB);

      const result = await service.respond('uuid-review-1', makeRespondReviewDto());

      expect(result).toEqual(REVIEW_COM_RESPOSTA_STUB);
    });

    it('atualiza pelo id correto da review', async () => {
      prismaMock.review.update.mockResolvedValue(REVIEW_COM_RESPOSTA_STUB);

      await service.respond('uuid-review-1', makeRespondReviewDto());

      expect(prismaMock.review.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'uuid-review-1' } }),
      );
    });
  });
});