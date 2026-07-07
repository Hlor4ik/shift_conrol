import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: Telegraf | null = null;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) return;
    this.bot = new Telegraf(token);
    this.bot.launch().catch(() => {
      // Bot may fail in dev without valid token
    });
  }

  async sendMessage(telegramId: string, text: string): Promise<boolean> {
    if (!this.bot) return false;
    try {
      await this.bot.telegram.sendMessage(telegramId, text);
      return true;
    } catch {
      return false;
    }
  }
}
