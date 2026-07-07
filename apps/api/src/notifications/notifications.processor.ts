import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@shiftcontrol/database';

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  constructor(
    private notifications: NotificationsService,
    private prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<{ workerId: string; shiftId: string; hoursBefore: number }>) {
    if (job.name === 'send-reminder') {
      const { workerId, shiftId, hoursBefore } = job.data;
      const application = await this.prisma.shiftApplication.findUnique({
        where: { shiftId_workerId: { shiftId, workerId } },
      });
      if (!application || application.status !== 'CONFIRMED') return;

      const shift = await this.prisma.shift.findUnique({ where: { id: shiftId } });
      if (!shift || shift.status === 'CANCELLED') return;

      await this.notifications.create(
        workerId,
        NotificationType.SHIFT_REMINDER,
        `Напоминание: смена через ${hoursBefore}ч`,
        `Смена «${shift.title}» начнётся в ${shift.startTime}. Адрес: ${shift.address}`,
        { shiftId },
      );

      await this.prisma.scheduledNotification.updateMany({
        where: { userId: workerId, shiftId, status: 'PENDING', sendAt: { lte: new Date() } },
        data: { status: 'SENT' },
      });
    }
  }
}
