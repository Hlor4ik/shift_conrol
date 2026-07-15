import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PaymentStatus } from '@shiftcontrol/database';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminAlertsService } from '../notifications/admin-alerts.service';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private adminAlerts: AdminAlertsService,
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
          paidBy: {
            select: {
              id: true,
              email: true,
              managerProfile: { select: { fullName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);
    return {
      items: items.map((p) => ({
        ...p,
        amount: p.amount.toString(),
      })),
      total,
      page,
      limit,
    };
  }

  async createForApplication(applicationId: string) {
    const existing = await this.prisma.payment.findUnique({ where: { applicationId } });
    if (existing) return existing;

    const application = await this.prisma.shiftApplication.findUnique({
      where: { id: applicationId },
      include: { shift: true },
    });
    if (!application) throw new NotFoundException('Application not found');

    const payment = await this.prisma.payment.create({
      data: {
        applicationId,
        workerId: application.workerId,
        shiftId: application.shiftId,
        amount: application.shift.cost,
        status: PaymentStatus.PENDING,
      },
    });

    void this.adminAlerts.notifyPaymentPending(payment.id);
    return payment;
  }

  async update(
    id: string,
    data: { status: PaymentStatus; comment?: string; paidAt?: Date },
    companyId?: string | null,
    paidById?: string,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        shift: { select: { companyId: true } },
        paidBy: { include: { managerProfile: true } },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (companyId && payment.shift.companyId !== companyId) {
      throw new ForbiddenException('Payment not in your company');
    }

    const wasPaid = payment.status === PaymentStatus.PAID;
    const updated = await this.prisma.payment.update({
      where: { id },
      data: {
        status: data.status,
        comment: data.comment,
        paidAt: data.status === PaymentStatus.PAID ? (data.paidAt ?? new Date()) : data.paidAt,
        paidById:
          data.status === PaymentStatus.PAID && !wasPaid
            ? (paidById ?? payment.paidById)
            : data.status === PaymentStatus.PAID
              ? payment.paidById
              : null,
      },
      include: {
        paidBy: { include: { managerProfile: true } },
        worker: { include: { workerProfile: true } },
        shift: true,
      },
    });

    if (data.status === PaymentStatus.PAID && !wasPaid) {
      await this.notifications.notifyPayment(payment.workerId, id);

      const confirmer = updated.paidBy
        ? {
            userId: updated.paidBy.id,
            name:
              updated.paidBy.managerProfile?.fullName ??
              updated.paidBy.email ??
              'Администратор',
            via: 'admin' as const,
          }
        : undefined;
      void this.adminAlerts.notifyPaymentConfirmed(id, confirmer);
    }

    return { ...updated, amount: updated.amount.toString() };
  }

  async bulkCreateForShift(shiftId: string, companyId?: string | null) {
    const shift = await this.prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new NotFoundException('Shift not found');
    if (companyId && shift.companyId !== companyId) {
      throw new ForbiddenException('Shift not in your company');
    }
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
