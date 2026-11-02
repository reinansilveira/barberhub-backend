import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import {
  AuthPrincipal,
  hasRole,
  isBackOfficePrincipal,
} from '../types/auth-principal.type';

@Injectable()
export class AdminOrProfessionalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const principal = request['user'] as AuthPrincipal | undefined;

    if (
      !isBackOfficePrincipal(principal) ||
      (!hasRole(principal, UserRole.ADMIN) &&
        !hasRole(principal, UserRole.PROFESSIONAL))
    ) {
      throw new ForbiddenException(
        'Acesso exclusivo para administradores ou profissionais',
      );
    }

    return true;
  }
}
