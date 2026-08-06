import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ClientAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const principal = request['user'] as unknown as { accountType?: string } | undefined;
    if (principal?.accountType !== 'CLIENT') {
      throw new UnauthorizedException('Acesso exclusivo para clientes');
    }
    return true;
  }
}
