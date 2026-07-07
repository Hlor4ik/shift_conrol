import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PaymentStatus } from '@shiftcontrol/database';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async findAll(companyId: string | null, filters: {
    workerId?: string;
    shiftId?: string;
    status?: PaymentStatus;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = {
      ...(filters.workerId && { workerId: filters.workerId }),
      ...(filters.shiftId && { shiftId: filters.shiftId }),
      ...(filters.status && { status: filters.status }),
      ...(companyId && { shift: { companyId } }),
    };
    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        include: {
          worker: { include: { workerProfile: true } },
          shift: { select: { id: true, title: true, date: true, companyId: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async createForApplication(applicationId: string) {
    const existing = await this.prisma.payment.findUnique({ where: { applicationId } });
    if (existing) return existing;

    const application = await this.prisma.shiftApplication.findUnique({
      where: { id: applicationId },
      include: { shift: true },
    });
    if (!application) throw new NotFoundException('Application not found');

    return this.prisma.payment.create({
      data: {
        applicationId,
        workerId: application.workerId,
        shiftId: application.shiftId,
        amount: application.shift.cost,
        status: PaymentStatus.PENDING,
      },
    });
  }

  async update(id: string, data: { status: PaymentStatus; comment?: string; paidAt?: Date }) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');

    const updated = await this.prisma.payment.update({
      where: { id },
      data: {
        status: data.status,
        comment: data.comment,
        paidAt: data.status === PaymentStatus.PAID ? (data.paidAt ?? new Date()) : data.paidAt,
      },
    });

    if (data.status === PaymentStatus.PAID) {
      await this.notifications.notifyPayment(payment.workerId, id);
    }
    return updated;
  }

  async bulkCreateForShift(shiftId: string) {
    const applications = await this.prisma.shiftApplication.findMany({
      where: { shiftId, status: 'COMPLETED' },
      include: { shift: true },
    });
    const results = [];
    for (const app of applications) {
      try {
        const payment = await this.createForApplication(app.id);
        results.push(payment);
      } catch (e) {
        if (e instanceof ConflictException) continue;
        throw e;
      }
    }
    return results;
  }
}
