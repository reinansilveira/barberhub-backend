import { CreateReviewDto } from '../../../src/modules/reviews/dto/create-review.dto';
import { RespondReviewDto } from '../../../src/modules/reviews/dto/respond-review.dto';

export const makeCreateReviewDto = (
  overrides?: Partial<CreateReviewDto>,
): CreateReviewDto => ({
  appointmentId: 'uuid-appointment-1',
  rating: 5,
  comment: 'Excelente atendimento!',
  ...overrides,
});

export const makeRespondReviewDto = (
  overrides?: Partial<RespondReviewDto>,
): RespondReviewDto => ({
  response: 'Obrigado pela avaliação!',
  ...overrides,
});