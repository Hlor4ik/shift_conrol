import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationType } from '@shiftcontrol/database';
import { REMINDER_HOURS } from '@shiftcontrol/shared';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from './telegram.service';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private telegram: TelegramService,
    private config: ConfigService,
    @InjectQueue('notifications') private queue: Queue,
  ) {}

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    const notification = await this.prisma.notification.create({
      data: { userId, type, title, body, data: data as object },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true },
    });
    if (user?.telegramId) {
      const sent = await this.telegram.sendMessage(user.telegramId.toString(), `${title}\n\n${body}`);
      if (sent) {
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { sentViaTelegram: true },
        });
      }
    }
    return notification;
  }

  async getForUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { items, total, unread, page, limit };
  }

  async markRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async notifyApplicationConfirmed(workerId: string, shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: { object: true },
    });
    if (!shift) return;
    return this.create(
      workerId,
      NotificationType.APPLICATION_CONFIRMED,
      'Запись подтверждена',
      `Вы записаны на смену «${shift.title}» ${shift.date.toLocaleDateString('ru-RU')} в ${shift.startTime}`,
      { shiftId },
    );
  }

  async notifyShiftChanged(shiftId: string) {
    const applications = await this.prisma.shiftApplication.findMany({
      where: { shiftId, status: 'CONFIRMED' },
      include: { shift: true },
    });
    for (const app of applications) {
      await this.create(
        app.workerId,
        NotificationType.SHIFT_CHANGED,
        'Смена изменена',
        `Смена «${app.shift.title}» была изменена. Проверьте детали.`,
        { shiftId },
      );
    }
  }

  async notifyShiftCancelled(shiftId: string) {
    const applications = await this.prisma.shiftApplication.findMany({
      where: { shiftId, status: 'CONFIRMED' },
      include: { shift: true },
    });
    for (const app of applications) {
      await this.create(
        app.workerId,
        NotificationType.SHIFT_CANCELLED,
        'Смена отменена',
        `Смена «${app.shift.title}» отменена.`,
        { shiftId },
      );
    }
    await this.prisma.scheduledNotification.updateMany({
      where: { shiftId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
  }

  async notifyNewShift(shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: { object: true, company: true },
    });
    if (!shift) return;

    const workers = await this.prisma.workerProfile.findMany({
      where: {
        rating: { gte: shift.minRating },
        user: { status: 'ACTIVE' },
      },
      include: { user: true },
    });

    const blacklisted = await this.prisma.workerListEntry.findMany({
      where: { companyId: shift.companyId, listType: 'BLACKLIST' },
      select: { workerId: true },
    });
    const blacklistedIds = new Set(blacklisted.map((b) => b.workerId));

    for (const worker of workers) {
      if (blacklistedIds.has(worker.userId)) continue;
      await this.create(
        worker.userId,
        NotificationType.SYSTEM,
        'Новая смена',
        `Доступна смена «${shift.title}» — ${shift.cost} ₽, ${shift.date.toLocaleDateString('ru-RU')}`,
        { shiftId },
      );
    }
  }

  async notifyPayment(workerId: string, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { shift: true },
    });
    if (!payment) return;
    return this.create(
      workerId,
      NotificationType.PAYMENT_INFO,
      'Информация о выплате',
      `Выплата ${payment.amount} ₽ за смену «${payment.shift.title}» обработана.`,
      { paymentId },
    );
  }

  async scheduleShiftReminders(workerId: string, shiftId: string) {
    const shift = await this.prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) return;

    const shiftDateTime = new Date(shift.date);
    const [hours, minutes] = shift.startTime.split(':').map(Number);
    shiftDateTime.setHours(hours, minutes, 0, 0);

    for (const hoursBefore of REMINDER_HOURS) {
      const sendAt = new Date(shiftDateTime.getTime() - hoursBefore * 60 * 60 * 1000);
      if (sendAt <= new Date()) continue;

      await this.prisma.scheduledNotification.create({
        data: {
          userId: workerId,
          shiftId,
          type: NotificationType.SHIFT_REMINDER,
          title: `Напоминание: смена через ${hoursBefore}ч`,
          body: `Смена «${shift.title}» начнётся в ${shift.startTime}`,
          sendAt,
        },
      });

      await this.queue.add(
        'send-reminder',
        { workerId, shiftId, hoursBefore },
        { delay: sendAt.getTime() - Date.now(), jobId: `${shiftId}-${workerId}-${hoursBefore}h` },
      );
    }
  }

  async cancelShiftReminders(workerId: string, shiftId: string) {
    await this.prisma.scheduledNotification.updateMany({
      where: { userId: workerId, shiftId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
    for (const hoursBefore of REMINDER_HOURS) {
      const job = await this.queue.getJob(`${shiftId}-${workerId}-${hoursBefore}h`);
      if (job) await job.remove();
    }
  }
}
