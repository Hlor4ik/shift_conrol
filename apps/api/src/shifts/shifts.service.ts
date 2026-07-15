import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ShiftStatus, Prisma, ApplicationStatus } from '@shiftcontrol/database';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { computeShiftDuration, startOfDayUTC } from '../common/utils';
import { NotificationsService } from '../notifications/notifications.service';
import { ApplicationsService } from '../applications/applications.service';

@Injectable()
export class ShiftsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private applications: ApplicationsService,
  ) {}

  async findAll(
    companyId: string | null,
    filters: {
      objectId?: string;
      dateFrom?: string;
      dateTo?: string;
      foremanId?: string;
      status?: ShiftStatus;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const where: Prisma.ShiftWhereInput = {
      ...(companyId && { companyId }),
      ...(filters.objectId && { objectId: filters.objectId }),
      ...(filters.foremanId && { foremanId: filters.foremanId }),
      ...(filters.status && { status: filters.status }),
      ...(filters.dateFrom || filters.dateTo
        ? {
            date: {
              ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
              ...(filters.dateTo && { lte: new Date(filters.dateTo) }),
            },
          }
        : {}),
    };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.shift.findMany({
        where,
        skip,
        take: limit,
        include: {
          object: true,
          foreman: { include: { foremanProfile: true } },
          photos: { orderBy: { sortOrder: 'asc' } },
          _count: { select: { applications: true } },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      }),
      this.prisma.shift.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findAvailableForWorker(workerId: string, city?: string, page = 1, limit = 20) {
    const profile = await this.prisma.workerProfile.findUnique({ where: { userId: workerId } });
    if (!profile) throw new NotFoundException('Worker profile not found');

    const blacklisted = await this.prisma.workerListEntry.findMany({
      where: { workerId, listType: 'BLACKLIST' },
      select: { companyId: true },
    });
    const blacklistedCompanyIds = blacklisted.map((b) => b.companyId);

    const now = new Date();
    const todayStart = startOfDayUTC(now);
    const bookedDayRanges = await this.applications.getBookedDayRanges(workerId, todayStart);

    const where: Prisma.ShiftWhereInput = {
      status: ShiftStatus.PUBLISHED,
      date: { gte: todayStart },
      minRating: { lte: profile.rating },
      ...(blacklistedCompanyIds.length && { companyId: { notIn: blacklistedCompanyIds } }),
      ...(city && { object: { address: { contains: city, mode: 'insensitive' } } }),
      applications: {
        none: { workerId, status: ApplicationStatus.CONFIRMED },
      },
      OR: [
        { registrationDeadline: null },
        { registrationDeadline: { gt: now } },
      ],
      ...(bookedDayRanges.length > 0 && {
        NOT: {
          OR: bookedDayRanges.map(({ gte, lte }) => ({ date: { gte, lte } })),
        },
      }),
    };

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.shift.findMany({
        where,
        skip,
        take: limit,
        include: {
          object: true,
          foreman: { include: { foremanProfile: true } },
          photos: { orderBy: { sortOrder: 'asc' } },
          company: { select: { id: true, name: true } },
        },
        orderBy: { date: 'asc' },
      }),
      this.prisma.shift.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOneForWorker(shiftId: string, workerId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        object: true,
        company: { select: { id: true, name: true } },
        foreman: { include: { foremanProfile: true } },
        photos: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!shift) throw new NotFoundException('Shift not found');
    if (shift.status !== ShiftStatus.PUBLISHED) {
      throw new NotFoundException('Shift not available');
    }

    const blacklisted = await this.prisma.workerListEntry.findFirst({
      where: { companyId: shift.companyId, workerId, listType: 'BLACKLIST' },
    });
    if (blacklisted) throw new ForbiddenException('You are blacklisted for this company');

    const workerContext = await this.applications.getWorkerShiftContext(workerId, shift);

    return {
      ...this.serializeShiftForWorker(shift),
      workerContext: {
        ...workerContext,
        conflictShift: workerContext.conflictShift
          ? {
              id: workerContext.conflictShift.id,
              title: workerContext.conflictShift.title,
              date: workerContext.conflictShift.date.toISOString(),
              startTime: workerContext.conflictShift.startTime,
              address: workerContext.conflictShift.address,
            }
          : null,
      },
    };
  }

  private serializeShiftForWorker(shift: {
    cost: { toString(): string };
    date: Date;
    [key: string]: unknown;
  }) {
    const { cost, date, ...rest } = shift;
    return {
      ...rest,
      cost: cost.toString(),
      date: date.toISOString(),
    };
  }

  async findOne(companyId: string | null, id: string) {
    const shift = await this.prisma.shift.findFirst({
      where: { id, ...(companyId && { companyId }) },
      include: {
        object: true,
        company: { select: { id: true, name: true } },
        foreman: { include: { foremanProfile: true } },
        photos: { orderBy: { sortOrder: 'asc' } },
        applications: {
          include: {
            worker: { include: { workerProfile: true } },
            attendance: true,
            rating: true,
          },
        },
        changeLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!shift) throw new NotFoundException('Shift not found');
    return shift;
  }

  async create(
    companyId: string,
    userId: string,
    data: {
      objectId: string;
      title: string;
      address: string;
      latitude?: number;
      longitude?: number;
      date: string;
      startTime: string;
      endTime: string;
      cost: number;
      maxWorkers: number;
      description?: string;
      requirements?: string;
      minRating?: number;
      registrationDeadline?: string;
      foremanId?: string;
      gpsRadiusMeters?: number;
    },
  ) {
    const duration = computeShiftDuration(data.startTime, data.endTime);
    if (duration <= 0) throw new BadRequestException('Invalid shift times');

    const object = await this.prisma.constructionObject.findFirst({
      where: { id: data.objectId, companyId },
    });
    if (!object) throw new NotFoundException('Object not found');

    return this.prisma.shift.create({
      data: {
        companyId,
        objectId: data.objectId,
        title: data.title,
        address: data.address,
        latitude: data.latitude ?? object.latitude,
        longitude: data.longitude ?? object.longitude,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        duration,
        cost: data.cost,
        maxWorkers: data.maxWorkers,
        description: data.description,
        requirements: data.requirements,
        minRating: data.minRating ?? 0,
        registrationDeadline: data.registrationDeadline
          ? new Date(data.registrationDeadline)
          : undefined,
        foremanId: data.foremanId,
        gpsRadiusMeters: data.gpsRadiusMeters ?? 200,
        status: ShiftStatus.DRAFT,
      },
    });
  }

  async update(companyId: string, id: string, userId: string, data: Record<string, unknown>) {
    const shift = await this.findOne(companyId, id);
    if (shift.status === ShiftStatus.COMPLETED || shift.status === ShiftStatus.CANCELLED) {
      throw new BadRequestException('Cannot update completed or cancelled shift');
    }

    const updateData: Prisma.ShiftUpdateInput = {};
    const logEntries: Array<{ field: string; oldValue: string; newValue: string }> = [];

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      const oldVal = String((shift as Record<string, unknown>)[key] ?? '');
      const newVal = String(value);
      if (oldVal !== newVal) {
        logEntries.push({ field: key, oldValue: oldVal, newValue: newVal });
      }
      (updateData as Record<string, unknown>)[key] = value;
    }

    if (data.startTime || data.endTime) {
      const start = (data.startTime as string) ?? shift.startTime;
      const end = (data.endTime as string) ?? shift.endTime;
      updateData.duration = computeShiftDuration(start, end);
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.shift.update({ where: { id }, data: updateData }),
      ...logEntries.map((log) =>
        this.prisma.shiftChangeLog.create({
          data: { shiftId: id, userId, ...log },
        }),
      ),
    ]);

    if (shift.status === ShiftStatus.PUBLISHED) {
      await this.notifications.notifyShiftChanged(id);
    }

    return updated;
  }

  async publish(companyId: string, id: string) {
    const shift = await this.findOne(companyId, id);
    if (shift.status !== ShiftStatus.DRAFT) {
      throw new BadRequestException('Only draft shifts can be published');
    }
    const qrToken = randomBytes(32).toString('hex');
    const updated = await this.prisma.shift.update({
      where: { id },
      data: { status: ShiftStatus.PUBLISHED, qrCheckInToken: qrToken },
    });
    await this.notifications.notifyNewShift(id);
    return updated;
  }

  async cancel(companyId: string, id: string) {
    const shift = await this.findOne(companyId, id);
    if (shift.status === ShiftStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed shift');
    }
    const updated = await this.prisma.shift.update({
      where: { id },
      data: { status: ShiftStatus.CANCELLED },
    });
    await this.notifications.notifyShiftCancelled(id);
    return updated;
  }

  async startShift(companyId: string, id: string) {
    const shift = await this.findOne(companyId, id);
    if (shift.status !== ShiftStatus.PUBLISHED) {
      throw new BadRequestException('Shift must be published');
    }
    return this.prisma.shift.update({
      where: { id },
      data: { status: ShiftStatus.IN_PROGRESS },
    });
  }

  async remove(companyId: string, id: string) {
    const shift = await this.findOne(companyId, id);
    if (shift.status === ShiftStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot delete in-progress shift');
    }
    return this.prisma.shift.delete({ where: { id } });
  }

  async getForemanShifts(foremanId: string, status?: ShiftStatus) {
    return this.prisma.shift.findMany({
      where: {
        foremanId,
        ...(status && { status }),
      },
      include: {
        object: true,
        applications: {
          include: { worker: { include: { workerProfile: true } }, attendance: true, rating: true },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async addPhoto(shiftId: string, url: string, key: string, sortOrder = 0) {
    return this.prisma.shiftPhoto.create({ data: { shiftId, url, key, sortOrder } });
  }
}
