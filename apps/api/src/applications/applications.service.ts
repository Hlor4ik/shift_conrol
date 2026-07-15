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
import { AdminAlertsService } from '../notifications/admin-alerts.service';
import { RatingService } from '../rating/rating.service';
import { startOfDayUTC, endOfDayUTC } from '../common/utils';
import { DEFAULT_RATING_RULES } from '@shiftcontrol/shared';

@Injectable()
export class ApplicationsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private adminAlerts: AdminAlertsService,
    private ratingService: RatingService,
  ) {}

  async findSameDayConfirmedApplication(
    workerId: string,
    shiftDate: Date,
    excludeShiftId?: string,
  ) {
    const dayStart = startOfDayUTC(shiftDate);
    const dayEnd = endOfDayUTC(shiftDate);
    return this.prisma.shiftApplication.findFirst({
      where: {
        workerId,
        status: ApplicationStatus.CONFIRMED,
        ...(excludeShiftId && { shiftId: { not: excludeShiftId } }),
        shift: { date: { gte: dayStart, lte: dayEnd } },
      },
      include: {
        shift: {
          select: { id: true, title: true, date: true, startTime: true, address: true },
        },
      },
    });
  }

  async getBookedDayRanges(workerId: string, from = new Date()) {
    const booked = await this.prisma.shiftApplication.findMany({
      where: {
        workerId,
        status: ApplicationStatus.CONFIRMED,
        shift: { date: { gte: from } },
      },
      select: { shift: { select: { date: true } } },
    });
    return booked.map(({ shift }) => ({
      gte: startOfDayUTC(shift.date),
      lte: endOfDayUTC(shift.date),
    }));
  }

  async getWorkerShiftContext(
    workerId: string,
    shift: {
      id: string;
      date: Date;
      bookedWorkers: number;
      maxWorkers: number;
      status: ShiftStatus;
    },
  ) {
    const worker = await this.prisma.user.findUnique({
      where: { id: workerId },
      select: { status: true },
    });
    const accountVerified = worker?.status === UserStatus.ACTIVE;

    const myApp = await this.prisma.shiftApplication.findUnique({
      where: { shiftId_workerId: { shiftId: shift.id, workerId } },
    });
    const applied = myApp?.status === ApplicationStatus.CONFIRMED;

    let conflictShift: {
      id: string;
      title: string;
      date: Date;
      startTime: string;
      address: string;
    } | null = null;

    if (!applied) {
      const conflict = await this.findSameDayConfirmedApplication(workerId, shift.date, shift.id);
      conflictShift = conflict?.shift ?? null;
    }

    const shiftDate = new Date(shift.date);
    const hoursUntil = (shiftDate.getTime() - Date.now()) / (1000 * 60 * 60);

    let conflictCancelPenaltyApplies = false;
    if (conflictShift) {
      const conflictHours =
        (new Date(conflictShift.date).getTime() - Date.now()) / (1000 * 60 * 60);
      conflictCancelPenaltyApplies = conflictHours < 24 && conflictHours > 0;
    }

    const spotsLeft = shift.maxWorkers - shift.bookedWorkers;

    return {
      applied,
      accountVerified,
      canApply:
        accountVerified &&
        !applied &&
        !conflictShift &&
        spotsLeft > 0 &&
        shift.status === ShiftStatus.PUBLISHED,
      conflictShift,
      cancelPenaltyApplies: applied && hoursUntil < 24 && hoursUntil > 0,
      cancelPenaltyPoints: DEFAULT_RATING_RULES.CANCEL_LESS_24H,
      conflictCancelPenaltyApplies,
      conflictCancelPenaltyPoints: DEFAULT_RATING_RULES.CANCEL_LESS_24H,
    };
  }

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
    if (worker.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(
        'Аккаунт не подтверждён. Загрузите документ и дождитесь проверки администратором.',
      );
    }
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
    if (existing?.status === ApplicationStatus.CONFIRMED) {
      throw new ConflictException('Already applied');
    }

    const sameDay = await this.findSameDayConfirmedApplication(workerId, shift.date, shiftId);
    if (sameDay) {
      throw new BadRequestException(
        `У вас уже есть смена на этот день: «${sameDay.shift.title}». Сначала отмените её.`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const current = await tx.shift.findUnique({ where: { id: shiftId } });
      if (!current || current.bookedWorkers >= current.maxWorkers) {
        throw new BadRequestException('No available spots');
      }

      const wasConfirmed = existing?.status === ApplicationStatus.CONFIRMED;

      const application = await tx.shiftApplication.upsert({
        where: { shiftId_workerId: { shiftId, workerId } },
        update: { status: ApplicationStatus.CONFIRMED, cancelledAt: null },
        create: { shiftId, workerId, status: ApplicationStatus.CONFIRMED },
      });

      if (!wasConfirmed) {
        await tx.shift.update({
          where: { id: shiftId },
          data: { bookedWorkers: { increment: 1 } },
        });
      }

      return application;
    });

    await this.notifications.notifyApplicationConfirmed(workerId, shiftId);
    await this.notifications.scheduleShiftReminders(workerId, shiftId);
    void this.adminAlerts.notifyShiftApplication(workerId, shiftId);

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
    let penaltyApplied = false;
    if (hoursUntil < 24 && hoursUntil > 0) {
      await this.ratingService.applyRule(workerId, 'CANCEL_LESS_24H', shiftId);
      penaltyApplied = true;
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
    return { ...result, penaltyApplied, penaltyPoints: penaltyApplied ? DEFAULT_RATING_RULES.CANCEL_LESS_24H : 0 };
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
