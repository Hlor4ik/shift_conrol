import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ShiftStatus, AttendanceStatus } from '@shiftcontrol/database';
import { PrismaService } from '../prisma/prisma.service';
import { RatingService } from '../rating/rating.service';
import { PaymentsService } from '../payments/payments.service';
import { haversineDistance } from '../common/utils';

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private ratingService: RatingService,
    private paymentsService: PaymentsService,
  ) {}

  async submitBatch(
    foremanId: string,
    shiftId: string,
    items: Array<{
      applicationId: string;
      status: AttendanceStatus;
      stars?: number;
      comment?: string;
      isBestWorker?: boolean;
    }>,
  ) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: { applications: true },
    });
    if (!shift) throw new NotFoundException('Shift not found');
    if (shift.foremanId !== foremanId) {
      throw new ForbiddenException('Not assigned to this shift');
    }
    if (shift.status !== ShiftStatus.IN_PROGRESS && shift.status !== ShiftStatus.PUBLISHED) {
      throw new BadRequestException('Shift cannot accept attendance');
    }

    const results = [];
    for (const item of items) {
      const application = shift.applications.find((a) => a.id === item.applicationId);
      if (!application) continue;

      const attendance = await this.prisma.attendanceRecord.upsert({
        where: { applicationId: item.applicationId },
        update: {
          status: item.status,
          stars: item.stars,
          comment: item.comment,
          markedByForemanId: foremanId,
        },
        create: {
          applicationId: item.applicationId,
          shiftId,
          status: item.status,
          stars: item.stars,
          comment: item.comment,
          markedByForemanId: foremanId,
        },
      });

      if (item.stars) {
        await this.prisma.workerRating.upsert({
          where: { applicationId: item.applicationId },
          update: { stars: item.stars, comment: item.comment, isBestWorker: item.isBestWorker ?? false },
          create: {
            applicationId: item.applicationId,
            stars: item.stars,
            comment: item.comment,
            isBestWorker: item.isBestWorker ?? false,
          },
        });
      }

      await this.ratingService.processAttendanceRatings(
        application.workerId,
        shiftId,
        item.status,
        item.stars,
        item.isBestWorker,
      );

      if (item.status !== AttendanceStatus.ABSENT) {
        await this.paymentsService.createForApplication(item.applicationId);
        await this.prisma.workerProfile.update({
          where: { userId: application.workerId },
          data: {
            totalShifts: { increment: 1 },
            totalEarnings: { increment: shift.cost },
          },
        });
      }

      await this.prisma.shiftApplication.update({
        where: { id: item.applicationId },
        data: {
          status: item.status === AttendanceStatus.ABSENT ? 'NO_SHOW' : 'COMPLETED',
        },
      });

      results.push(attendance);
    }

    await this.prisma.shift.update({
      where: { id: shiftId },
      data: { status: ShiftStatus.COMPLETED },
    });

    return results;
  }

  async qrCheckIn(workerId: string, shiftId: string, token: string) {
    const shift = await this.prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift || shift.qrCheckInToken !== token) {
      throw new BadRequestException('Invalid QR code');
    }

    const application = await this.prisma.shiftApplication.findUnique({
      where: { shiftId_workerId: { shiftId, workerId } },
    });
    if (!application || application.status !== 'CONFIRMED') {
      throw new BadRequestException('No confirmed application');
    }

    return this.prisma.attendanceRecord.upsert({
      where: { applicationId: application.id },
      update: { checkedInAt: new Date(), checkedInViaQr: true },
      create: {
        applicationId: application.id,
        shiftId,
        status: AttendanceStatus.PRESENT,
        checkedInAt: new Date(),
        checkedInViaQr: true,
      },
    });
  }

  async gpsCheckIn(
    workerId: string,
    shiftId: string,
    latitude: number,
    longitude: number,
    accuracy?: number,
  ) {
    const shift = await this.prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new NotFoundException('Shift not found');
    if (!shift.latitude || !shift.longitude) {
      throw new BadRequestException('Shift has no GPS coordinates');
    }

    const distance = haversineDistance(latitude, longitude, shift.latitude, shift.longitude);
    const verified = distance <= shift.gpsRadiusMeters;

    const application = await this.prisma.shiftApplication.findUnique({
      where: { shiftId_workerId: { shiftId, workerId } },
    });
    if (!application) throw new BadRequestException('No application found');

    return this.prisma.attendanceRecord.upsert({
      where: { applicationId: application.id },
      update: {
        checkedInAt: new Date(),
        checkedInGps: { latitude, longitude, accuracy },
        gpsVerified: verified,
      },
      create: {
        applicationId: application.id,
        shiftId,
        status: verified ? AttendanceStatus.PRESENT : AttendanceStatus.LATE,
        checkedInAt: new Date(),
        checkedInGps: { latitude, longitude, accuracy },
        gpsVerified: verified,
      },
    });
  }

  async getShiftQr(shiftId: string, foremanId: string) {
    const shift = await this.prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new NotFoundException('Shift not found');
    if (shift.foremanId !== foremanId) throw new ForbiddenException('Not your shift');
    return { token: shift.qrCheckInToken, shiftId };
  }
}
