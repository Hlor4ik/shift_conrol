import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus, UserRole, NotificationType } from '@shiftcontrol/database';
import type { Context } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from './telegram.service';
import { NotificationsService } from './notifications.service';

type BankDetails = { bankName?: string; accountNumber?: string; bik?: string } | null;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatBankDetails(bd: BankDetails): string {
  if (!bd || (!bd.bankName && !bd.accountNumber && !bd.bik)) return '—';
  const lines: string[] = [];
  if (bd.bankName) lines.push(`Банк: ${bd.bankName}`);
  if (bd.accountNumber) lines.push(`Счёт: ${bd.accountNumber}`);
  if (bd.bik) lines.push(`БИК: ${bd.bik}`);
  return lines.join('\n');
}

function formatDateTime(d: Date): string {
  return d.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
}

function formatMoney(amount: { toString(): string } | string | number): string {
  return `${Number(amount).toLocaleString('ru-RU')} ₽`;
}

@Injectable()
export class AdminAlertsService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private telegram: TelegramService,
    private config: ConfigService,
    private notifications: NotificationsService,
  ) {}

  onModuleInit() {
    this.telegram.onCallback(async (data, ctx) => {
      if (data.startsWith('pay:')) {
        const paymentId = data.slice(4);
        await this.confirmPaymentFromBot(paymentId, ctx);
      }
    });
  }

  private getAdminUrl(path: string): string {
    const domain = this.config.get<string>('DOMAIN');
    if (domain) return `https://${domain}${path}`;
    return path;
  }

  private async resolveConfirmer(telegramUserId: number) {
    const user = await this.prisma.user.findFirst({
      where: {
        telegramId: BigInt(telegramUserId),
        role: { in: [UserRole.SUPERADMIN, UserRole.MANAGER] },
      },
      include: { managerProfile: true },
    });
    if (user) {
      const name =
        user.managerProfile?.fullName ?? user.email ?? user.telegramUsername ?? 'Администратор';
      return { userId: user.id, name };
    }
    return null;
  }

  async notifyWorkerRegistered(userId: string) {
    const profile = await this.prisma.workerProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { telegramUsername: true, telegramId: true, createdAt: true } },
      },
    });
    if (!profile) return;

    const text =
      `🆕 <b>Новая регистрация</b>\n\n` +
      `👤 ${escapeHtml(profile.fullName)}\n` +
      `📱 ${escapeHtml(profile.phone)}\n` +
      `📍 ${escapeHtml(profile.city)} · ${escapeHtml(profile.specialty)}\n` +
      `⭐ Рейтинг: ${profile.rating}\n` +
      (profile.user.telegramUsername ? `TG: @${escapeHtml(profile.user.telegramUsername)}\n` : '') +
      `\n💳 <b>Реквизиты:</b>\n${escapeHtml(formatBankDetails(profile.bankDetails as BankDetails))}\n\n` +
      `🕐 ${formatDateTime(new Date())}`;

    await this.telegram.sendAdminAlert(text, {
      replyMarkup: this.telegram.inlineKeyboard([
        [{ text: '👤 Карточка работника', url: this.getAdminUrl(`/admin/workers/${userId}`) }],
      ]),
    });
  }

  async notifyRequisitesUpdated(userId: string, bankDetails: BankDetails) {
    const profile = await this.prisma.workerProfile.findUnique({
      where: { userId },
      include: { user: { select: { telegramUsername: true } } },
    });
    if (!profile) return;

    const text =
      `💳 <b>Обновлены реквизиты</b>\n\n` +
      `👤 ${escapeHtml(profile.fullName)}\n` +
      `📱 ${escapeHtml(profile.phone)}\n` +
      (profile.user.telegramUsername ? `TG: @${escapeHtml(profile.user.telegramUsername)}\n` : '') +
      `\n${escapeHtml(formatBankDetails(bankDetails))}\n\n` +
      `🕐 ${formatDateTime(new Date())}`;

    await this.telegram.sendAdminAlert(text, {
      replyMarkup: this.telegram.inlineKeyboard([
        [{ text: '👤 Карточка работника', url: this.getAdminUrl(`/admin/workers/${userId}`) }],
        [{ text: '💰 Выплаты', url: this.getAdminUrl('/admin/payments') }],
      ]),
    });
  }

  async notifyDocumentUploaded(userId: string, fileName: string) {
    const profile = await this.prisma.workerProfile.findUnique({
      where: { userId },
      include: { user: { select: { telegramUsername: true } } },
    });
    if (!profile) return;

    const text =
      `📄 <b>Документ на проверке</b>\n\n` +
      `👤 ${escapeHtml(profile.fullName)}\n` +
      `📎 ${escapeHtml(fileName)}\n` +
      (profile.user.telegramUsername ? `TG: @${escapeHtml(profile.user.telegramUsername)}\n` : '') +
      `\n🕐 ${formatDateTime(new Date())}`;

    await this.telegram.sendAdminAlert(text, {
      replyMarkup: this.telegram.inlineKeyboard([
        [{ text: '✅ Проверить', url: this.getAdminUrl('/admin/verification') }],
        [{ text: '👤 Карточка работника', url: this.getAdminUrl(`/admin/workers/${userId}`) }],
      ]),
    });
  }

  async notifyShiftApplication(workerId: string, shiftId: string) {
    const [profile, shift] = await Promise.all([
      this.prisma.workerProfile.findUnique({
        where: { userId: workerId },
        include: { user: { select: { telegramUsername: true } } },
      }),
      this.prisma.shift.findUnique({
        where: { id: shiftId },
        include: { object: true, company: true },
      }),
    ]);
    if (!profile || !shift) return;

    const text =
      `📋 <b>Новая запись на смену</b>\n\n` +
      `👤 ${escapeHtml(profile.fullName)} (⭐ ${profile.rating})\n` +
      `📱 ${escapeHtml(profile.phone)}\n` +
      `🏗 Смена: «${escapeHtml(shift.title)}»\n` +
      `📅 ${shift.date.toLocaleDateString('ru-RU')} ${shift.startTime}\n` +
      `💰 ${formatMoney(shift.cost)}\n` +
      `🏢 ${escapeHtml(shift.company.name)}\n\n` +
      `🕐 ${formatDateTime(new Date())}`;

    await this.telegram.sendAdminAlert(text, {
      replyMarkup: this.telegram.inlineKeyboard([
        [{ text: '📋 Смена', url: this.getAdminUrl(`/admin/shifts/${shiftId}`) }],
        [{ text: '👤 Работник', url: this.getAdminUrl(`/admin/workers/${workerId}`) }],
      ]),
    });
  }

  async notifyPaymentPending(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        worker: { include: { workerProfile: true } },
        shift: { include: { company: true } },
      },
    });
    if (!payment || payment.status !== PaymentStatus.PENDING) return;

    const bd = payment.worker.workerProfile?.bankDetails as BankDetails;
    const text =
      `💸 <b>Новая выплата (ожидает)</b>\n\n` +
      `👤 ${escapeHtml(payment.worker.workerProfile?.fullName ?? '—')}\n` +
      `📱 ${escapeHtml(payment.worker.workerProfile?.phone ?? '—')}\n` +
      `🏗 «${escapeHtml(payment.shift.title)}»\n` +
      `💰 <b>${formatMoney(payment.amount)}</b>\n` +
      `🏢 ${escapeHtml(payment.shift.company.name)}\n\n` +
      `💳 <b>Реквизиты:</b>\n${escapeHtml(formatBankDetails(bd))}\n\n` +
      `🕐 ${formatDateTime(new Date())}`;

    await this.telegram.sendAdminAlert(text, {
      replyMarkup: this.telegram.inlineKeyboard([
        [{ text: '✅ Выплачено', callback_data: `pay:${paymentId}` }],
        [{ text: '💰 Открыть в админке', url: this.getAdminUrl('/admin/payments') }],
      ]),
    });
  }

  async notifyPaymentConfirmed(
    paymentId: string,
    confirmer?: { userId: string; name: string; via?: 'admin' | 'telegram' },
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        worker: { include: { workerProfile: true } },
        shift: true,
        paidBy: { include: { managerProfile: true } },
      },
    });
    if (!payment) return;

    const confirmerName =
      confirmer?.name ??
      payment.paidBy?.managerProfile?.fullName ??
      payment.paidBy?.email ??
      '—';
    const via = confirmer?.via === 'telegram' ? ' (Telegram)' : '';
    const paidAt = payment.paidAt ? formatDateTime(payment.paidAt) : formatDateTime(new Date());

    const text =
      `✅ <b>Выплата подтверждена</b>\n\n` +
      `👤 ${escapeHtml(payment.worker.workerProfile?.fullName ?? '—')}\n` +
      `💰 ${formatMoney(payment.amount)}\n` +
      `🏗 «${escapeHtml(payment.shift.title)}»\n\n` +
      `👨‍💼 Подтвердил: <b>${escapeHtml(confirmerName)}</b>${via}\n` +
      `🕐 ${paidAt}` +
      (payment.comment ? `\n💬 ${escapeHtml(payment.comment)}` : '');

    await this.telegram.sendAdminAlert(text);
  }

  async notifyWorkerVerified(workerId: string, adminId: string) {
    const [worker, admin] = await Promise.all([
      this.prisma.workerProfile.findUnique({
        where: { userId: workerId },
        include: { user: { select: { telegramUsername: true } } },
      }),
      this.prisma.user.findUnique({
        where: { id: adminId },
        include: { managerProfile: true },
      }),
    ]);
    if (!worker) return;

    const adminName = admin?.managerProfile?.fullName ?? admin?.email ?? 'Администратор';
    const now = formatDateTime(new Date());

    await this.notifications.create(
      workerId,
      NotificationType.SYSTEM,
      'Аккаунт подтверждён',
      'Ваш аккаунт и документ проверены. Теперь вы можете записываться на смены.',
    );

    const text =
      `✅ <b>Работник подтверждён</b>\n\n` +
      `👤 ${escapeHtml(worker.fullName)}\n` +
      `📱 ${escapeHtml(worker.phone)}\n\n` +
      `👨‍💼 Подтвердил: <b>${escapeHtml(adminName)}</b>\n` +
      `🕐 ${now}`;

    await this.telegram.sendAdminAlert(text, {
      replyMarkup: this.telegram.inlineKeyboard([
        [{ text: '👤 Карточка', url: this.getAdminUrl(`/admin/workers/${workerId}`) }],
      ]),
    });
  }

  async notifyWorkerRejected(workerId: string, adminId: string, reason: string) {
    const [worker, admin] = await Promise.all([
      this.prisma.workerProfile.findUnique({
        where: { userId: workerId },
        include: { user: { select: { telegramUsername: true } } },
      }),
      this.prisma.user.findUnique({
        where: { id: adminId },
        include: { managerProfile: true },
      }),
    ]);
    if (!worker) return;

    const adminName = admin?.managerProfile?.fullName ?? admin?.email ?? 'Администратор';

    await this.notifications.create(
      workerId,
      NotificationType.SYSTEM,
      'Документ отклонён',
      `Документ не прошёл проверку: ${reason}. Загрузите документ заново в настройках профиля.`,
    );

    const text =
      `❌ <b>Документ отклонён</b>\n\n` +
      `👤 ${escapeHtml(worker.fullName)}\n` +
      `💬 ${escapeHtml(reason)}\n\n` +
      `👨‍💼 Отклонил: <b>${escapeHtml(adminName)}</b>\n` +
      `🕐 ${formatDateTime(new Date())}`;

    await this.telegram.sendAdminAlert(text, {
      replyMarkup: this.telegram.inlineKeyboard([
        [{ text: '👤 Карточка', url: this.getAdminUrl(`/admin/workers/${workerId}`) }],
        [{ text: '📋 Очередь проверки', url: this.getAdminUrl('/admin/verification') }],
      ]),
    });
  }

  private async confirmPaymentFromBot(paymentId: string, ctx: Context) {
    if (!this.telegram.isAdminAction(ctx)) {
      await ctx.answerCbQuery('Нет доступа');
      return;
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { shift: { select: { companyId: true } } },
    });
    if (!payment) {
      await ctx.answerCbQuery('Выплата не найдена');
      return;
    }
    if (payment.status === PaymentStatus.PAID) {
      await ctx.answerCbQuery('Уже выплачено');
      return;
    }

    const confirmer = ctx.from?.id ? await this.resolveConfirmer(ctx.from.id) : null;
    const paidAt = new Date();
    const comment = ctx.from?.username
      ? `Подтверждено через Telegram (@${ctx.from.username})`
      : 'Подтверждено через Telegram';

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.PAID,
        paidAt,
        paidById: confirmer?.userId ?? null,
        comment: payment.comment ?? comment,
      },
    });

    await this.notifications.notifyPayment(payment.workerId, paymentId);
    await this.notifyPaymentConfirmed(paymentId, {
      userId: confirmer?.userId ?? '',
      name: confirmer?.name ?? (ctx.from?.username ? `@${ctx.from.username}` : 'Telegram'),
      via: 'telegram',
    });

    try {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } catch {
      // message may be too old
    }
    await ctx.answerCbQuery('✅ Выплата отмечена');
  }
}
