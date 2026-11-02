import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ProfessionalAuthGuard } from '../../../src/modules/auth/guards/professional-auth.guard';

describe('ProfessionalAuthGuard', () => {
  const guard = new ProfessionalAuthGuard();

  const contextFor = (user: unknown) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  it('permite usuário com papel PROFESSIONAL atribuído, mesmo com papel legado diferente', () => {
    expect(
      guard.canActivate(
        contextFor({
          accountType: 'USER',
          role: UserRole.CLIENT,
          roles: [UserRole.PROFESSIONAL, UserRole.ADMIN],
        }),
      ),
    ).toBe(true);
  });

  it('mantém compatibilidade com o papel legado quando roles está vazio', () => {
    expect(
      guard.canActivate(
        contextFor({
          accountType: 'USER',
          role: UserRole.PROFESSIONAL,
          roles: [],
        }),
      ),
    ).toBe(true);
  });

  it('bloqueia cliente mesmo se um claim indevido listar PROFESSIONAL', () => {
    expect(() =>
      guard.canActivate(
        contextFor({
          accountType: 'CLIENT',
          role: UserRole.CLIENT,
          roles: [UserRole.PROFESSIONAL],
        }),
      ),
    ).toThrow(ForbiddenException);
  });
});
