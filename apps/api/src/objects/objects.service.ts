import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ObjectsService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async findAll(companyId: string, page = 1, limit = 20, activeOnly = true) {
    const where = {
      companyId,
      ...(activeOnly && { isActive: true }),
    };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.constructionObject.findMany({
        where,
        skip,
        take: limit,
        include: { photos: { orderBy: { sortOrder: 'asc' } }, _count: { select: { shifts: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.constructionObject.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(companyId: string | null, id: string) {
    const object = await this.prisma.constructionObject.findFirst({
      where: { id, ...(companyId && { companyId }) },
      include: { photos: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!object) throw new NotFoundException('Object not found');
    return object;
  }

  async create(
    companyId: string,
    data: {
      name: string;
      address: string;
      latitude?: number;
      longitude?: number;
      description?: string;
    },
  ) {
    let { latitude, longitude } = data;
    if (!latitude || !longitude) {
      const coords = await this.geocode(data.address);
      latitude = coords?.latitude;
      longitude = coords?.longitude;
    }
    return this.prisma.constructionObject.create({
      data: { ...data, companyId, latitude, longitude },
    });
  }

  async update(
    companyId: string,
    id: string,
    data: Partial<{
      name: string;
      address: string;
      latitude: number;
      longitude: number;
      description: string;
      isActive: boolean;
    }>,
  ) {
    await this.findOne(companyId, id);
    return this.prisma.constructionObject.update({ where: { id }, data });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    return this.prisma.constructionObject.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async addPhoto(objectId: string, url: string, key: string, sortOrder = 0) {
    return this.prisma.objectPhoto.create({
      data: { objectId, url, key, sortOrder },
    });
  }

  private async geocode(address: string): Promise<{ latitude: number; longitude: number } | null> {
    const apiKey = this.config.get<string>('YANDEX_MAPS_API_KEY');
    if (!apiKey) return null;
    try {
      const url = `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&format=json&geocode=${encodeURIComponent(address)}`;
      const res = await fetch(url);
      const json = (await res.json()) as {
        response: {
          GeoObjectCollection: {
            featureMember: Array<{
              GeoObject: { Point: { pos: string } };
            }>;
          };
        };
      };
      const pos =
        json.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos;
      if (!pos) return null;
      const [lon, lat] = pos.split(' ').map(Number);
      return { latitude: lat, longitude: lon };
    } catch {
      return null;
    }
  }
}
