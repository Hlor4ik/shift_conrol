import { Injectable } from '@nestjs/common';
import { DEFAULT_RATING_RULES, RATING_MIN, RATING_MAX } from '@shiftcontrol/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

export type RatingRuleKey = keyof typeof DEFAULT_RATING_RULES;

@Injectable()
export class RatingService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  async getRules(companyId?: string | null) {
    return this.settings.getRatingRules(companyId);
  }

  async applyRule(workerId: string, rule: RatingRuleKey | string, shiftId?: string, createdById?: string) {
    const profile = await this.prisma.workerProfile.findUnique({ where: { userId: workerId } });
    if (!profile) return null;

    const shift = shiftId
      ? await this.prisma.shift.findUnique({ where: { id: shiftId }, select: { companyId: true } })
      : null;
    const rules = await this.getRules(shift?.companyId);
    const change = (rules as Record<string, number>)[rule] ?? 0;
    if (change === 0) return profile;

    const newRating = Math.min(RATING_MAX, Math.max(RATING_MIN, profile.rating + change));

    await this.prisma.$transaction([
      this.prisma.workerProfile.update({
        where: { userId: workerId },
        data: { rating: newRating },
      }),
      this.prisma.ratingHistory.create({
        data: {
          workerId,
          change,
          reason: rule,
          previousRating: profile.rating,
          newRating,
          shiftId,
          createdById,
        },
      }),
    ]);

    return { previousRating: profile.rating, newRating, change };
  }

  async processAttendanceRatings(
    workerId: string,
    shiftId: string,
    attendanceStatus: string,
    stars?: number,
    isBestWorker?: boolean,
  ) {
    if (attendanceStatus === 'ABSENT') {
      await this.applyRule(workerId, 'NO_SHOW', shiftId);
      return;
    }
    if (attendanceStatus === 'LATE') {
      await this.applyRule(workerId, 'LATE', shiftId);
    }
    if (attendanceStatus === 'FULL_SHIFT' || attendanceStatus === 'PRESENT') {
      await this.applyRule(workerId, 'ON_TIME', shiftId);
    }
    if (stars !== undefined) {
      if (stars >= 4) {
        await this.applyRule(workerId, 'GOOD_RATING', shiftId);
      } else if (stars <= 2) {
        await this.applyRule(workerId, 'BAD_RATING', shiftId);
      }
    }
    if (isBestWorker) {
      await this.applyRule(workerId, 'BEST_WORKER', shiftId);
    }
  }
}
