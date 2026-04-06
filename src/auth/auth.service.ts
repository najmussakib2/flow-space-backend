/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { DatabaseService } from 'src/database/database.service';
import config from 'config';

@Injectable()
export class AuthService {
  constructor(
    private prisma: DatabaseService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto, userAgent?: string, ip?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { email: dto.email, name: dto.name, passwordHash, isVerified: true },
      select: { id: true, email: true, name: true, avatarUrl: true },
    });

    const tokens = await this.generateTokens(user.id, user.email, userAgent, ip);
    return { user, ...tokens };
  }

  async login(dto: LoginDto, userAgent?: string, ip?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email, deletedAt: null },
    });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user.id, user.email, userAgent, ip);
    return {
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
      ...tokens,
    };
  }

  async googleLogin(googleUser: any, userAgent?: string, ip?: string) {
    let user = await this.prisma.user.findUnique({ where: { email: googleUser.email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { ...googleUser, isVerified: true },
      });
    }
    const tokens = await this.generateTokens(user.id, user.email, userAgent, ip);
    return {
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
      include: { user: { select: { id: true, email: true, deletedAt: true } } },
    });
    if (!session || session.expiresAt < new Date() || session.user.deletedAt) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const newRefreshToken = uuidv4();
    const expiresAt = this.getRefreshExpiry();

    await this.prisma.session.update({
      where: { id: session.id },
      data: { refreshToken: newRefreshToken, expiresAt },
    });

    const accessToken = this.signAccess(session.user.id, session.user.email);
    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string) {
    await this.prisma.session.deleteMany({ where: { refreshToken } });
  }

  async logoutAll(userId: string) {
    await this.prisma.session.deleteMany({ where: { userId } });
  }

  private async generateTokens(userId: string, email: string, userAgent?: string, ip?: string) {
    const accessToken = this.signAccess(userId, email);
    const refreshToken = uuidv4();
    const expiresAt = this.getRefreshExpiry();
    await this.prisma.session.create({
      data: { userId, refreshToken, userAgent, ipAddress: ip, expiresAt },
    });
    return { accessToken, refreshToken };
  }

  private signAccess(userId: string, email: string) {
    const accessSecret = this.configService.get('jwt.accessSecret') ?? config.jwt.accessSecret;
    const accessExpiry = this.configService.get('jwt.accessExpiry') ?? config.jwt.accessExpiry;
    return this.jwtService.sign(
      { sub: userId, email },
      {
        secret: accessSecret,
        expiresIn: accessExpiry,
      },
    );
  }

  private getRefreshExpiry() {
    const expiry = this.configService.get<string>('jwt.refreshExpiry')|| config.jwt.refreshExpiry || '7d';
    const days = parseInt(expiry.replace('d', ''));
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  }
}