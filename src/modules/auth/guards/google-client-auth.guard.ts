import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleClientAuthGuard extends AuthGuard('google-client') {}
