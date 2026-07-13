import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Role } from "@petrus/shared";
import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";

interface AccessTokenPayload {
  sub: string;
  email: string;
  papel: Role;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_ACCESS_SECRET")!,
    });
  }

  validate(payload: AccessTokenPayload): AuthenticatedUser {
    return { userId: payload.sub, email: payload.email, papel: payload.papel };
  }
}
