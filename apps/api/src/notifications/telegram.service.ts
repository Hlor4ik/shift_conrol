import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Markup, Telegraf } from 'telegraf';
import type { Context } from 'telegraf';

type CallbackHandler = (data: string, ctx: Context) => Promise<void>;

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private bot: Telegraf | null = null;
  private callbackHandler: CallbackHandler | null = null;
  private adminChatIds = new Set<string>();

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) return;

    const miniAppUrl = this.getMiniAppUrl();
    this.adminChatIds = new Set(
      (this.config.get<string>('TELEGRAM_ADMIN_CHAT_ID') ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );

    this.bot = new Telegraf(token);

    this.bot.start(async (ctx) => {
      const chatId = ctx.chat?.id?.toString();
      const isAdmin = chatId && this.adminChatIds.has(chatId);

      if (isAdmin) {
        await ctx.reply(
          '👋 ShiftControl Admin Bot\n\n' +
            'Вы получаете уведомления о:\n' +
            '• новых регистрациях\n' +
            '• реквизитах и документах\n' +
            '• записях на смены\n' +
            '• выплатах (можно отметить «Выплачено»)\n\n' +
            `Chat ID: \`${chatId}\``,
          { parse_mode: 'Markdown' },
        );
        return;
      }

      await ctx.reply(
        'Добро пожаловать в ShiftControl!\n\n' +
          'Здесь вы можете отмечаться на сменах, подавать заявки и следить за своими сменами.\n\n' +
          'Нажмите кнопку ниже, чтобы открыть приложение.',
        Markup.inlineKeyboard([Markup.button.webApp('Открыть ShiftControl', miniAppUrl)]),
      );
    });

    this.bot.command('admin', async (ctx) => {
      const chatId = ctx.chat?.id?.toString() ?? '';
      await ctx.reply(
        `🔧 Admin Bot\n\nChat ID: \`${chatId}\`\n\n` +
          'Добавьте этот ID в переменную TELEGRAM_ADMIN_CHAT_ID для получения уведомлений.',
        { parse_mode: 'Markdown' },
      );
    });

    this.bot.on('callback_query', async (ctx) => {
      const data = 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
      if (!data || !this.callbackHandler) {
        await ctx.answerCbQuery();
        return;
      }
      try {
        await this.callbackHandler(data, ctx);
      } catch {
        await ctx.answerCbQuery('Ошибка обработки');
      }
    });

    this.bot.launch().catch(() => {
      // Bot may fail in dev without valid token
    });
  }

  async onModuleDestroy() {
    await this.bot?.stop('NestJS shutdown');
  }

  onCallback(handler: CallbackHandler) {
    this.callbackHandler = handler;
  }

  isAdminAction(ctx: { chat?: { id: number }; from?: { id: number } }): boolean {
    const chatId = ctx.chat?.id?.toString();
    if (chatId && this.adminChatIds.has(chatId)) return true;
    const userId = ctx.from?.id?.toString();
    if (userId && this.adminChatIds.has(userId)) return true;
    return false;
  }

  inlineKeyboard(buttons: { text: string; url?: string; callback_data?: string }[][]) {
    return Markup.inlineKeyboard(
      buttons.map((row) =>
        row.map((btn) =>
          btn.url
            ? Markup.button.url(btn.text, btn.url)
            : Markup.button.callback(btn.text, btn.callback_data ?? 'noop'),
        ),
      ),
    );
  }

  private getMiniAppUrl(): string {
    const domain = this.config.get<string>('DOMAIN');
    if (domain) return `https://${domain}/`;

    const corsOrigins = this.config.get<string>('CORS_ORIGINS') ?? '';
    const origin = corsOrigins.split(',')[0]?.trim();
    if (origin) return `${origin.replace(/\/$/, '')}/`;

    return 'http://localhost:5173/';
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

  async sendAdminAlert(
    text: string,
    options?: { replyMarkup?: ReturnType<typeof Markup.inlineKeyboard> },
  ): Promise<boolean> {
    if (!this.bot || this.adminChatIds.size === 0) return false;

    let sent = false;
    for (const chatId of this.adminChatIds) {
      try {
        await this.bot.telegram.sendMessage(chatId, text, {
          parse_mode: 'HTML',
          link_preview_options: { is_disabled: true },
          ...(options?.replyMarkup ? { reply_markup: options.replyMarkup.reply_markup } : {}),
        });
        sent = true;
      } catch {
        // skip failed chat
      }
    }
    return sent;
  }
}
