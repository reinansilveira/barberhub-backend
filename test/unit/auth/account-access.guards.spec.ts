import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AdminAuthGuard } from '../../../src/modules/auth/guards/admin-auth.guard';
import { ClientOrProfessionalAuthGuard } from '../../../src/modules/auth/guards/client-or-professional-auth.guard';

describe('account access guards', () => {
  const contextFor = (user: unknown) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  it('mantém rotas administrativas restritas ao administrador', () => {
    const guard = new AdminAuthGuard();

    expect(
      guard.canActivate(
        contextFor({
          accountType: 'USER',
          role: UserRole.CLIENT,
          roles: [UserRole.ADMIN, UserRole.PROFESSIONAL],
        }),
      ),
    ).toBe(true);
    expect(
      guard.canActivate(
        contextFor({
          accountType: 'USER',
          role: UserRole.ADMIN,
          roles: [],
        }),
      ),
    ).toBe(true);
    expect(() =>
      guard.canActivate(
        contextFor({
          accountType: 'CLIENT',
          role: UserRole.CLIENT,
          roles: [UserRole.ADMIN],
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('permite notificações próprias para cliente e profissional, sem liberar admin por engano', () => {
    const guard = new ClientOrProfessionalAuthGuard();

    expect(
      guard.canActivate(
        contextFor({ accountType: 'CLIENT', role: UserRole.CLIENT }),
      ),
    ).toBe(true);
    expect(
      guard.canActivate(
        contextFor({
          accountType: 'USER',
          role: UserRole.CLIENT,
          roles: [UserRole.PROFESSIONAL],
        }),
      ),
    ).toBe(true);
    expect(() =>
      guard.canActivate(contextFor({ accountType: 'USER', role: UserRole.ADMIN })),
    ).toThrow(ForbiddenException);
  });
});
