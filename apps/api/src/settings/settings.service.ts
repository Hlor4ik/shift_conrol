import { Injectable } from '@nestjs/common';
import { DEFAULT_RATING_RULES } from '@shiftcontrol/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async get(key: string, companyId?: string | null) {
    const setting = await this.prisma.setting.findFirst({
      where: {
        key,
        OR: [{ companyId: companyId ?? null }, { companyId: null }],
      },
      orderBy: { companyId: 'desc' },
    });
    return setting?.value;
  }

  async set(key: string, value: unknown, companyId?: string | null) {
    const cid = companyId ?? null;
    const existing = await this.prisma.setting.findFirst({
      where: { key, companyId: cid },
    });
    if (existing) {
      return this.prisma.setting.update({
        where: { id: existing.id },
        data: { value: value as object },
      });
    }
    return this.prisma.setting.create({
      data: { companyId: cid, key, value: value as object },
    });
  }

  async getRatingRules(companyId?: string | null) {
    const rules = await this.get('rating_rules', companyId);
    return { ...DEFAULT_RATING_RULES, ...(rules as object) };
  }

  async getGpsRadius(companyId?: string | null) {
    const radius = await this.get('gps_default_radius_meters', companyId);
    return typeof radius === 'number' ? radius : 200;
  }

  async getAll(companyId?: string | null) {
    const settings = await this.prisma.setting.findMany({
      where: { OR: [{ companyId: companyId ?? null }, { companyId: null }] },
    });
    return settings;
  }
}
