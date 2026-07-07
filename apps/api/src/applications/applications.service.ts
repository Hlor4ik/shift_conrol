import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ShiftStatus, ApplicationStatus, UserStatus } from '@shiftcontrol/database';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RatingService } from '../rating/rating.service';

@Injectable()
export class ApplicationsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private ratingService: RatingService,
  ) {}

  async apply(workerId: string, shiftId: string) {
    const [worker, shift] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: workerId },
        include: { workerProfile: true },
      }),
      this.prisma.shift.findUnique({ where: { id: shiftId } }),
    ]);

    if (!worker?.workerProfile) throw new NotFoundException('Worker profile required');
    if (worker.status === UserStatus.BLOCKED) throw new ForbiddenException('Account blocked');
    if (!shift) throw new NotFoundException('Shift not found');
    if (shift.status !== ShiftStatus.PUBLISHED) {
      throw new BadRequestException('Shift is not available');
    }
    if (worker.workerProfile.rating < shift.minRating) {
      throw new BadRequestException('Rating too low for this shift');
    }
    if (shift.registrationDeadline && shift.registrationDeadline < new Date()) {
      throw new BadRequestException('Registration deadline passed');
    }

    const blacklisted = await this.prisma.workerListEntry.findFirst({
      where: { companyId: shift.companyId, workerId, listType: 'BLACKLIST' },
    });
    if (blacklisted) throw new ForbiddenException('You are blacklisted for this company');

    const existing = await this.prisma.shiftApplication.findUnique({
      where: { shiftId_workerId: { shiftId, workerId } },
    });
    if (existing && existing.status === ApplicationStatus.CONFIRMED) {
      throw new ConflictException('Already applied');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const current = await tx.shift.findUnique({ where: { id: shiftId } });
      if (!current || current.bookedWorkers >= current.maxWorkers) {
        throw new BadRequestException('No available spots');
      }

      const application = await tx.shiftApplication.upsert({
        where: { shiftId_workerId: { shiftId, workerId } },
        update: { status: ApplicationStatus.CONFIRMED, cancelledAt: null },
        create: { shiftId, workerId, status: ApplicationStatus.CONFIRMED },
      });

      await tx.shift.update({
        where: { id: shiftId },
        data: { bookedWorkers: { increment: 1 } },
      });

      return application;
    });

    await this.notifications.notifyApplicationConfirmed(workerId, shiftId);
    await this.notifications.scheduleShiftReminders(workerId, shiftId);

    return result;
  }

  async cancel(workerId: string, shiftId: string) {
    const application = await this.prisma.shiftApplication.findUnique({
      where: { shiftId_workerId: { shiftId, workerId } },
      include: { shift: true },
    });
    if (!application || application.status !== ApplicationStatus.CONFIRMED) {
      throw new NotFoundException('Application not found');
    }

    const shiftDate = new Date(application.shift.date);
    const hoursUntil = (shiftDate.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < 24 && hoursUntil > 0) {
      await this.ratingService.applyRule(workerId, 'CANCEL_LESS_24H', shiftId);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.shiftApplication.update({
        where: { id: application.id },
        data: { status: ApplicationStatus.CANCELLED, cancelledAt: new Date() },
      });
      await tx.shift.update({
        where: { id: shiftId },
        data: { bookedWorkers: { decrement: 1 } },
      });
      return updated;
    });

    await this.notifications.cancelShiftReminders(workerId, shiftId);
    return result;
  }

  async listByShift(companyId: string | null, shiftId: string) {
    const shift = await this.prisma.shift.findFirst({
      where: { id: shiftId, ...(companyId && { companyId }) },
    });
    if (!shift) throw new NotFoundException('Shift not found');

    return this.prisma.shiftApplication.findMany({
      where: { shiftId },
      include: {
        worker: { include: { workerProfile: true } },
        attendance: true,
        rating: true,
        payment: true,
      },
    });
  }
}
