import { Injectable } from '@nestjs/common';
import { Prisma } from '@shiftcontrol/database';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(companyId: string | null) {
    const companyFilter = companyId ? { companyId } : {};
    let workerFilter: Prisma.WorkerProfileWhereInput = {};
    if (companyId) {
      workerFilter = {
        user: {
          applications: {
            some: {
              shift: { companyId },
              status: { in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] },
            },
          },
        },
      };
    }

    const [
      workersCount,
      activeShifts,
      shiftsWithSpots,
      noShows,
      avgRating,
      objectsStats,
      foremenStats,
      completedShifts,
    ] = await Promise.all([
      this.prisma.workerProfile.count({ where: workerFilter }),
      this.prisma.shift.count({
        where: { ...companyFilter, status: { in: ['PUBLISHED', 'IN_PROGRESS'] } },
      }),
      this.prisma.shift.findMany({
        where: { ...companyFilter, status: 'PUBLISHED' },
        select: { maxWorkers: true, bookedWorkers: true },
      }),
      this.prisma.shiftApplication.count({
        where: { status: 'NO_SHOW', shift: companyFilter },
      }),
      this.prisma.workerProfile.aggregate({ where: workerFilter, _avg: { rating: true } }),
      this.prisma.constructionObject.findMany({
        where: { ...companyFilter, isActive: true },
        include: {
          _count: { select: { shifts: true } },
          shifts: { where: { status: 'COMPLETED' }, select: { id: true } },
        },
      }),
      this.prisma.user.findMany({
        where: { role: 'FOREMAN', ...(companyId && { companyId }) },
        include: {
          foremanProfile: true,
          foremanShifts: { where: { status: 'COMPLETED' }, select: { id: true } },
        },
      }),
      this.prisma.shift.findMany({
        where: { ...companyFilter, status: 'COMPLETED' },
        select: { date: true },
        orderBy: { date: 'desc' },
        take: 500,
      }),
    ]);

    const freeSpots = shiftsWithSpots.reduce(
      (sum, s) => sum + Math.max(0, s.maxWorkers - s.bookedWorkers),
      0,
    );

    const monthMap = new Map<string, number>();
    for (const shift of completedShifts) {
      const month = shift.date.toISOString().slice(0, 7);
      monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
    }
    const shiftsByMonth = Array.from(monthMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);

    return {
      workersCount,
      activeShifts,
      freeSpots,
      noShows,
      averageRating: avgRating._avg.rating ?? 0,
      objectsStats: objectsStats.map((o) => ({
        id: o.id,
        name: o.name,
        totalShifts: o._count.shifts,
        completedShifts: o.shifts.length,
      })),
      foremenStats: foremenStats.map((f) => ({
        id: f.id,
        name: f.foremanProfile?.fullName,
        completedShifts: f.foremanShifts.length,
      })),
      shiftsByMonth,
    };
  }
}
