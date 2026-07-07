import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 20, search?: string) {
    const where = search
      ? { name: { contains: search, mode: 'insensitive' as const } }
      : {};
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.company.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
      this.prisma.company.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: { _count: { select: { users: true, objects: true, shifts: true } } },
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async create(data: {
    name: string;
    inn?: string;
    phone?: string;
    email?: string;
    address?: string;
  }) {
    return this.prisma.company.create({ data });
  }

  async update(
    id: string,
    data: Partial<{ name: string; inn: string; phone: string; email: string; address: string; isActive: boolean }>,
  ) {
    await this.findOne(id);
    return this.prisma.company.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.company.update({ where: { id }, data: { isActive: false } });
  }
}
