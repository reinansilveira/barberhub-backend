import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { CanActivate } from '@nestjs/common';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { AuthPrincipal } from '../types/auth-principal.type';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Token não informado');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token inválido');
    }

    try {
      const payload = this.jwt.verify(token, {
        secret: process.env.JWT_SECRET,
      }) as AuthPrincipal;
      let authenticatedUser:
        | {
            role: UserRole;
            roleAssignments?: { role: UserRole }[];
          }
        | undefined;

      if (payload.accountType === 'CLIENT') {
        const client = await this.prisma.client.findUnique({
          where: { id: payload.sub },
          select: {
            active: true,
            user: {
              select: {
                id: true,
                active: true,
                sessionVersion: true,
                role: true,
                roleAssignments: { select: { role: true } },
              },
            },
          },
        });

        if (
          !client ||
          !client.active ||
          !client.user.active ||
          payload.sessionVersion !== client.user.sessionVersion
        ) {
          throw new UnauthorizedException('Token inválido ou expirado');
        }

        authenticatedUser = client.user;
      } else {
        const user = await this.prisma.user.findUnique({
          where: { id: payload.sub },
          select: {
            active: true,
            sessionVersion: true,
            role: true,
            roleAssignments: { select: { role: true } },
          },
        });

        if (
          !user ||
          !user.active ||
          payload.sessionVersion !== user.sessionVersion
        ) {
          throw new UnauthorizedException('Token inválido ou expirado');
        }

        authenticatedUser = user;
      }

      if (!authenticatedUser) {
        throw new UnauthorizedException('Token inválido ou expirado');
      }

      const assignedRoles = (authenticatedUser.roleAssignments ?? [])
        .map(({ role }) => role)
        .filter((role): role is UserRole => Object.values(UserRole).includes(role));
      const legacyRole = Object.values(UserRole).includes(
        authenticatedUser.role,
      )
        ? authenticatedUser.role
        : undefined;
      const fallbackRole =
        payload.accountType === 'CLIENT'
          ? UserRole.CLIENT
          : legacyRole;
      const { role: _payloadRole, roles: _payloadRoles, ...safePayload } =
        payload;

      request['user'] = {
        ...safePayload,
        accountType: payload.accountType ?? 'USER',
        ...(fallbackRole ? { role: fallbackRole } : {}),
        roles:
          payload.accountType === 'CLIENT'
            ? [UserRole.CLIENT]
            : assignedRoles.length
              ? assignedRoles
              : fallbackRole
                ? [fallbackRole]
                : [],
      } satisfies AuthPrincipal;

      return true;
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}
