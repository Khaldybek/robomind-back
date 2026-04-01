import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../database/entities/user.entity';

export type JwtAccessPayload = {
  sub: string;
  role: string;
  email: string;
};

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {
    const secret = config.get<string>('JWT_ACCESS_SECRET');
    if (!secret?.trim()) {
      throw new Error('JWT_ACCESS_SECRET обязателен в .env');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtAccessPayload) {
    if (!payload?.sub) {
      throw new UnauthorizedException();
    }
    const user = await this.users.findOne({
      where: { id: payload.sub, isActive: true },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return {
      id: user.id,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      schoolId: user.schoolId,
    };
  }
}
