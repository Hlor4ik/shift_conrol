import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { UserStatus, WorkerListType, Prisma, ApplicationStatus, DocumentVerificationStatus } from '@shiftcontrol/database';
import { PrismaService } from '../prisma/prisma.service';
import { serializePayment, serializeShift } from '../common/serialize';
import { AdminAlertsService } from '../notifications/admin-alerts.service';

@Injectable()
export class WorkersService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => AdminAlertsService))
    private adminAlerts: AdminAlertsService,
  ) {}

  async register(
    userId: string,
    data: {
      fullName: string;
      phone: string;
      birthDate: string;
      city: string;
      specialty: string;
      experience: number;
      bankDetails?: Record<string, string>;
    },
  ) {
    const existing = await this.prisma.workerProfile.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('Profile already exists');

    const profile = await this.prisma.workerProfile.create({
      data: {
        userId,
        fullName: data.fullName,
        phone: data.phone,
        birthDate: new Date(data.birthDate),
        city: data.city,
        specialty: data.specialty,
        experience: data.experience,
        bankDetails: data.bankDetails,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.PENDING_VERIFICATION },
    });

    void this.adminAlerts.notifyWorkerRegistered(userId);
    return profile;
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        workerProfile: true,
        workerDocuments: { orderBy: { createdAt: 'desc' }, take: 1 },
        verifiedBy: { include: { managerProfile: true } },
      },
    });
    if (!user?.workerProfile) throw new NotFoundException('Worker profile not found');
    const { workerProfile, workerDocuments, verifiedBy, ...rest } = user;
    const latestDoc = workerDocuments[0] ?? null;
    return {
      ...rest,
      workerProfile: {
        ...workerProfile,
        birthDate: workerProfile.birthDate.toISOString().slice(0, 10),
        totalEarnings: workerProfile.totalEarnings.toString(),
      },
      verification: {
        status: user.status,
        verifiedAt: user.verifiedAt?.toISOString() ?? null,
        verifiedByName:
          verifiedBy?.managerProfile?.fullName ?? verifiedBy?.email ?? null,
        document: latestDoc
          ? {
              id: latestDoc.id,
              status: latestDoc.status,
              url: latestDoc.url,
              fileName: latestDoc.fileName,
              rejectReason: latestDoc.rejectReason,
              createdAt: latestDoc.createdAt.toISOString(),
            }
          : null,
      },
    };
  }

  async updateMe(userId: string, data: Partial<{
    fullName: string;
    phone: string;
    birthDate: string;
    city: string;
    specialty: string;
    experience: number;
    bankDetails: Record<string, string>;
    photoUrl: string;
    documentPhotoUrl: string;
  }>) {
    const profile = await this.prisma.workerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Worker profile not found');

    const bankDetailsChanged =
      data.bankDetails !== undefined &&
      JSON.stringify(data.bankDetails) !== JSON.stringify(profile.bankDetails);

    const updated = await this.prisma.workerProfile.update({
      where: { userId },
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      },
    });

    if (bankDetailsChanged && data.bankDetails) {
      void this.adminAlerts.notifyRequisitesUpdated(userId, data.bankDetails);
    }

    return updated;
  }

  async getDashboard(userId: string) {
    const profile = await this.prisma.workerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Worker profile not found');

    const now = new Date();
    const nextShift = await this.prisma.shiftApplication.findFirst({
      where: {
        workerId: userId,
        status: 'CONFIRMED',
        shift: { date: { gte: now }, status: { in: ['PUBLISHED', 'IN_PROGRESS'] } },
      },
      include: {
        shift: { include: { object: true, foreman: { include: { foremanProfile: true } } } },
      },
      orderBy: { shift: { date: 'asc' } },
    });

    const unreadNotifications = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return {
      rating: profile.rating,
      totalShifts: profile.totalShifts,
      totalEarnings: profile.totalEarnings.toString(),
      nextShift: nextShift?.shift
        ? {
            id: nextShift.shift.id,
            title: nextShift.shift.title,
            date: nextShift.shift.date.toISOString(),
            startTime: nextShift.shift.startTime,
            endTime: nextShift.shift.endTime,
            address: nextShift.shift.address,
            cost: nextShift.shift.cost.toString(),
          }
        : null,
      unreadNotifications,
    };
  }

  async search(filters: {
    search?: string;
    city?: string;
    specialty?: string;
    minRating?: number;
    maxRating?: number;
    status?: UserStatus;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const where: Prisma.WorkerProfileWhereInput = {
      ...(filters.city && { city: { contains: filters.city, mode: 'insensitive' } }),
      ...(filters.specialty && { specialty: { contains: filters.specialty, mode: 'insensitive' } }),
      ...(filters.minRating !== undefined && { rating: { gte: filters.minRating } }),
      ...(filters.maxRating !== undefined && { rating: { lte: filters.maxRating } }),
      ...(filters.search && {
        OR: [
          { fullName: { contains: filters.search, mode: 'insensitive' } },
          { phone: { contains: filters.search } },
          { user: { telegramUsername: { contains: filters.search, mode: 'insensitive' } } },
        ],
      }),
      ...(filters.status && { user: { status: filters.status } }),
    };

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.workerProfile.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              status: true,
              telegramId: true,
              telegramUsername: true,
              createdAt: true,
            },
          },
        },
        orderBy: { rating: 'desc' },
      }),
      this.prisma.workerProfile.count({ where }),
    ]);

    return {
      items: items.map((w) => ({
        ...w,
        user: w.user
          ? { ...w.user, telegramId: w.user.telegramId?.toString() ?? null }
          : w.user,
      })),
      total,
      page,
      limit,
    };
  }

  async findOne(workerId: string) {
    const profile = await this.prisma.workerProfile.findUnique({
      where: { userId: workerId },
      include: {
        user: {
          select: {
            id: true,
            status: true,
            telegramId: true,
            telegramUsername: true,
            createdAt: true,
            verifiedAt: true,
            verifiedBy: {
              select: {
                email: true,
                managerProfile: { select: { fullName: true } },
              },
            },
          },
        },
      },
    });
    if (!profile) throw new NotFoundException('Worker not found');

    const documents = await this.prisma.workerDocument.findMany({
      where: { workerId },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewedBy: {
          select: {
            email: true,
            managerProfile: { select: { fullName: true } },
          },
        },
      },
    });

    return {
      ...profile,
      user: profile.user
        ? {
            ...profile.user,
            telegramId: profile.user.telegramId?.toString() ?? null,
            verifiedByName:
              profile.user.verifiedBy?.managerProfile?.fullName ??
              profile.user.verifiedBy?.email ??
              null,
          }
        : profile.user,
      documents: documents.map((d) => ({
        id: d.id,
        type: d.type,
        status: d.status,
        url: d.url,
        fileName: d.fileName,
        rejectReason: d.rejectReason,
        createdAt: d.createdAt.toISOString(),
        reviewedAt: d.reviewedAt?.toISOString() ?? null,
        reviewedByName:
          d.reviewedBy?.managerProfile?.fullName ?? d.reviewedBy?.email ?? null,
      })),
    };
  }

  async updateRating(workerId: string, newRating: number, adminId: string) {
    if (newRating < 0 || newRating > 200) {
      throw new BadRequestException('Rating must be between 0 and 200');
    }
    const profile = await this.prisma.workerProfile.findUnique({ where: { userId: workerId } });
    if (!profile) throw new NotFoundException('Worker not found');

    await this.prisma.$transaction([
      this.prisma.workerProfile.update({
        where: { userId: workerId },
        data: { rating: newRating },
      }),
      this.prisma.ratingHistory.create({
        data: {
          workerId,
          change: newRating - profile.rating,
          reason: 'MANUAL_ADJUSTMENT',
          previousRating: profile.rating,
          newRating,
          createdById: adminId,
        },
      }),
    ]);
    return { rating: newRating };
  }

  async addToList(
    companyId: string,
    workerId: string,
    listType: WorkerListType,
    addedById: string,
    reason?: string,
  ) {
    return this.prisma.workerListEntry.upsert({
      where: { companyId_workerId_listType: { companyId, workerId, listType } },
      update: { reason, addedById },
      create: { companyId, workerId, listType, addedById, reason },
    });
  }

  async removeFromList(companyId: string, workerId: string, listType: WorkerListType) {
    return this.prisma.workerListEntry.delete({
      where: { companyId_workerId_listType: { companyId, workerId, listType } },
    });
  }

  async getMyShifts(userId: string, upcoming = true) {
    const now = new Date();
    const applications = await this.prisma.shiftApplication.findMany({
      where: upcoming
        ? {
            workerId: userId,
            status: ApplicationStatus.CONFIRMED,
            shift: { date: { gte: now }, status: { in: ['PUBLISHED', 'IN_PROGRESS'] } },
          }
        : {
            workerId: userId,
            status: { in: [ApplicationStatus.CONFIRMED, ApplicationStatus.COMPLETED] },
            shift: {
              OR: [{ date: { lt: now } }, { status: { in: ['COMPLETED', 'CANCELLED'] } }],
            },
          },
      include: {
        shift: { include: { object: true, foreman: { include: { foremanProfile: true } } } },
        payment: true,
        attendance: true,
        rating: true,
      },
      orderBy: { shift: { date: upcoming ? 'asc' : 'desc' } },
    });

    return applications.map((app) => ({
      ...app,
      shift: serializeShift(app.shift),
      payment: app.payment ? serializePayment(app.payment) : null,
    }));
  }

  async getMyPayments(userId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { workerId: userId },
      include: { shift: { select: { id: true, title: true, date: true, address: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map((payment) => ({
      ...serializePayment(payment),
      shift: {
        ...payment.shift,
        date: payment.shift.date.toISOString(),
      },
    }));
  }

  async listPendingVerification(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: Prisma.UserWhereInput = {
      role: 'WORKER',
      status: UserStatus.PENDING_VERIFICATION,
      workerProfile: { isNot: null },
    };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          workerProfile: true,
          workerDocuments: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: items.map((u) => ({
        userId: u.id,
        fullName: u.workerProfile!.fullName,
        phone: u.workerProfile!.phone,
        city: u.workerProfile!.city,
        specialty: u.workerProfile!.specialty,
        createdAt: u.createdAt.toISOString(),
        document: u.workerDocuments[0]
          ? {
              id: u.workerDocuments[0].id,
              status: u.workerDocuments[0].status,
              url: u.workerDocuments[0].url,
              fileName: u.workerDocuments[0].fileName,
              createdAt: u.workerDocuments[0].createdAt.toISOString(),
            }
          : null,
      })),
      total,
      page,
      limit,
    };
  }

  async verifyWorker(workerId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: workerId },
      include: { workerProfile: true },
    });
    if (!user?.workerProfile) throw new NotFoundException('Worker not found');
    if (user.status === UserStatus.BLOCKED) {
      throw new BadRequestException('Cannot verify blocked worker');
    }

    const pendingDoc = await this.prisma.workerDocument.findFirst({
      where: { workerId, status: DocumentVerificationStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });
    if (!pendingDoc) {
      throw new BadRequestException('Нет документа на проверке. Работник должен загрузить документ.');
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.workerDocument.update({
        where: { id: pendingDoc.id },
        data: {
          status: DocumentVerificationStatus.APPROVED,
          reviewedAt: now,
          reviewedById: adminId,
          rejectReason: null,
        },
      }),
      this.prisma.user.update({
        where: { id: workerId },
        data: {
          status: UserStatus.ACTIVE,
          verifiedAt: now,
          verifiedById: adminId,
        },
      }),
    ]);

    void this.adminAlerts.notifyWorkerVerified(workerId, adminId);
    return { success: true, verifiedAt: now.toISOString() };
  }

  async rejectWorker(workerId: string, adminId: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('Укажите причину отклонения');

    const user = await this.prisma.user.findUnique({ where: { id: workerId } });
    if (!user) throw new NotFoundException('Worker not found');

    const pendingDoc = await this.prisma.workerDocument.findFirst({
      where: { workerId, status: DocumentVerificationStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });
    if (!pendingDoc) {
      throw new BadRequestException('Нет документа на проверке');
    }

    const now = new Date();
    await this.prisma.workerDocument.update({
      where: { id: pendingDoc.id },
      data: {
        status: DocumentVerificationStatus.REJECTED,
        reviewedAt: now,
        reviewedById: adminId,
        rejectReason: reason.trim(),
      },
    });

    await this.prisma.user.update({
      where: { id: workerId },
      data: { status: UserStatus.PENDING_VERIFICATION },
    });

    void this.adminAlerts.notifyWorkerRejected(workerId, adminId, reason.trim());
    return { success: true };
  }
}
