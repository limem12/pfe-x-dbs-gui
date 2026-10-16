import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedRequestUser, JwtPayload } from './permissions';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'DBS_GUI_SECRET_KEY_2024',
    });
  }

  validate(payload: JwtPayload): AuthenticatedRequestUser {
    const rights = Array.isArray(payload.rights) ? payload.rights : [];

    return {
      username: payload.username || payload.sub,
      role: payload.role,
      rights,
    };
  }
}
