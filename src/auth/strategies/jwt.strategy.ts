/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from 'src/database/database.service';
import config from '../../../config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private prisma: DatabaseService,
  ) {
    const secret =
      configService.get<string>('jwt.accessSecret') ?? config.jwt.accessSecret;

    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not set in environment variables!');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        isVerified: true,
      },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }
}
