import { UserRole } from '@prisma/client';

export type AuthPrincipal = {
  sub: string;
  email?: string | null;
  accountType?: 'CLIENT' | 'USER';
  role?: UserRole;
  roles?: UserRole[];
  sessionVersion?: number;
};

export function hasRole(
  principal: Pick<AuthPrincipal, 'role' | 'roles'> | undefined,
  role: UserRole,
) {
  const assignedRoles = Array.isArray(principal?.roles)
    ? principal.roles.filter(
        (candidate): candidate is UserRole =>
          Object.values(UserRole).includes(candidate),
      )
    : [];

  return assignedRoles.includes(role) || principal?.role === role;
}

export function isBackOfficePrincipal(
  principal: Pick<AuthPrincipal, 'accountType'> | undefined,
) {
  return principal?.accountType !== 'CLIENT';
}
