import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, TelegramAuthDto } from './auth.dto';
import { Public, SkipAudit } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards';
import { CurrentUser } from '../common/current-user.decorator';
import type { JwtPayload } from '../common/current-user.decorator';

const REFRESH_COOKIE = 'refresh_token';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @SkipAudit()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Email/password login' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const deviceInfo = req.headers['user-agent'];
    const result = await this.authService.login(dto.email, dto.password, deviceInfo);
    this.setRefreshCookie(res, result.refreshToken, result.expiresIn);
    return { accessToken: result.accessToken };
  }

  @Public()
  @SkipAudit()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('telegram')
  @HttpCode(200)
  @ApiOperation({ summary: 'Telegram Mini App auth' })
  async telegram(
    @Body() dto: TelegramAuthDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const deviceInfo = req.headers['user-agent'];
    const result = await this.authService.telegramAuth(dto.initData, deviceInfo);
    this.setRefreshCookie(res, result.refreshToken, result.expiresIn);
    return {
      accessToken: result.accessToken,
      needsRegistration: result.needsRegistration,
    };
  }

  @Public()
  @SkipAudit()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) return { accessToken: null };
    const deviceInfo = req.headers['user-agent'];
    const result = await this.authService.refresh(token, deviceInfo);
    this.setRefreshCookie(res, result.refreshToken, result.expiresIn);
    return { accessToken: result.accessToken };
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (token) await this.authService.logout(token);
    this.clearRefreshCookie(res);
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current user profile' })
  async me(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.sub);
  }

  private setRefreshCookie(res: Response, token: string, maxAgeSeconds: number) {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: maxAgeSeconds * 1000,
      path: '/',
    };
    res.cookie(REFRESH_COOKIE, token, cookieOptions);
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
  }
}
