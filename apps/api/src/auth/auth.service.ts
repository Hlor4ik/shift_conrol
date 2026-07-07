import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { UserRole, UserStatus } from '@shiftcontrol/database';
import { PrismaService } from '../prisma/prisma.service';
import { validateTelegramInitData, parseTelegramUser } from '../common/utils';
import { JwtPayload } from '../common/current-user.decorator';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(email: string, password: string, deviceInfo?: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    if (user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException('Account blocked');
    }
    return this.issueTokens(user.id, user.role, user.companyId, user.email, deviceInfo);
  }

  async telegramAuth(initData: string, deviceInfo?: string) {
    const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) throw new BadRequestException('Telegram bot not configured');

    const data = validateTelegramInitData(initData, botToken);
    if (!data) throw new UnauthorizedException('Invalid Telegram data');

    const tgUser = parseTelegramUser(data);
    if (!tgUser) throw new UnauthorizedException('No user in Telegram data');

    let user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(tgUser.id) },
      include: { workerProfile: true },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          telegramId: BigInt(tgUser.id),
          telegramUsername: tgUser.username,
          role: UserRole.WORKER,
          status: UserStatus.PENDING_VERIFICATION,
        },
        include: { workerProfile: true },
      });
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException('Account blocked');
    }

    return {
      ...(await this.issueTokens(user.id, user.role, user.companyId, user.email, deviceInfo)),
      needsRegistration: !user.workerProfile && user.role === UserRole.WORKER,
    };
  }

  async refresh(refreshToken: string, deviceInfo?: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.issueTokens(
      stored.user.id,
      stored.user.role,
      stored.user.companyId,
      stored.user.email,
      deviceInfo,
    );
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    return { success: true };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        workerProfile: true,
        managerProfile: true,
        foremanProfile: true,
        company: true,
      },
    });
    if (!user) throw new UnauthorizedException();
    return this.sanitizeUser(user);
  }

  private async issueTokens(
    userId: string,
    role: UserRole,
    companyId: string | null,
    email: string | null,
    deviceInfo?: string,
  ) {
    const payload: JwtPayload = {
      sub: userId,
      role,
      companyId,
      email: email ?? undefined,
    };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow('JWT_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES', '15m'),
    });

    const refreshToken = randomBytes(64).toString('hex');
    const expiresIn = this.config.get('JWT_REFRESH_EXPIRES', '7d');
    const days = parseInt(expiresIn.replace('d', ''), 10) || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId, deviceInfo, expiresAt },
    });

    return { accessToken, refreshToken, expiresIn: days * 86400 };
  }

  private sanitizeUser(user: Record<string, unknown>) {
    const { passwordHash: _, ...rest } = user;
    const result = { ...rest } as Record<string, unknown>;
    if (result.telegramId) {
      result.telegramId = (result.telegramId as bigint).toString();
    }
    return result;
  }
}
