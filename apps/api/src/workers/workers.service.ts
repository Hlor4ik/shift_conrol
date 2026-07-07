import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { UserStatus, WorkerListType, Prisma } from '@shiftcontrol/database';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkersService {
  constructor(private prisma: PrismaService) {}

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

    const [, profile] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { status: UserStatus.ACTIVE },
      }),
      this.prisma.workerProfile.create({
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
      }),
    ]);
    return profile;
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { workerProfile: true },
    });
    if (!user?.workerProfile) throw new NotFoundException('Worker profile not found');
    return user;
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
    return this.prisma.workerProfile.update({
      where: { userId },
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      },
    });
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
      totalEarnings: profile.totalEarnings,
      nextShift: nextShift?.shift ?? null,
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
          },
        },
      },
    });
    if (!profile) throw new NotFoundException('Worker not found');
    return {
      ...profile,
      user: profile.user
        ? { ...profile.user, telegramId: profile.user.telegramId?.toString() ?? null }
        : profile.user,
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
    return this.prisma.shiftApplication.findMany({
      where: {
        workerId: userId,
        shift: upcoming
          ? { date: { gte: now }, status: { in: ['PUBLISHED', 'IN_PROGRESS'] } }
          : { OR: [{ date: { lt: now } }, { status: { in: ['COMPLETED', 'CANCELLED'] } }] },
      },
      include: {
        shift: { include: { object: true, foreman: { include: { foremanProfile: true } } } },
        payment: true,
        attendance: true,
        rating: true,
      },
      orderBy: { shift: { date: upcoming ? 'asc' : 'desc' } },
    });
  }

  async getMyPayments(userId: string) {
    return this.prisma.payment.findMany({
      where: { workerId: userId },
      include: { shift: { select: { id: true, title: true, date: true, address: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
