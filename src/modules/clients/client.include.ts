import { Prisma } from '@prisma/client';

export const clientUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatar: true,
  gender: true,
  active: true,
  mustChangePassword: true,
} as const;

export const clientInclude = {
  user: {
    select: clientUserSelect,
  },
} as const;

export type ClientWithUser = Prisma.ClientGetPayload<{
  include: typeof clientInclude;
}>;