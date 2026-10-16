import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard as NestAuthGuard } from '@nestjs/passport';
import type { AuthenticatedRequestUser } from './permissions';

@Injectable()
export class AuthGuard extends NestAuthGuard('jwt') {
  handleRequest<TUser = AuthenticatedRequestUser>(
    err: Error | null,
    user: AuthenticatedRequestUser | false | null | undefined,
  ): TUser {
    if (err) {
      throw err;
    }

    if (!user) {
      throw new UnauthorizedException('Authentification requise');
    }

    return user as TUser;
  }
}
