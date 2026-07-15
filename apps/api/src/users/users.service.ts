import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import type { JwtPayload } from '../common/current-user.decorator';
import * as bcrypt from 'bcryptjs';
import { UserRole, UserStatus, Prisma } from '@shiftcontrol/database';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string | null, page = 1, limit = 20, role?: UserRole) {
    const where: Prisma.UserWhereInput = {
      ...(companyId && { companyId }),
      ...(role && { role }),
      role: role ?? { in: [UserRole.MANAGER, UserRole.FOREMAN] },
    };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          companyId: true,
          createdAt: true,
          managerProfile: true,
          foremanProfile: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async createManager(data: {
    email: string;
    password: string;
    companyId: string;
    fullName: string;
    phone?: string;
  }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('Email already exists');
    const passwordHash = await bcrypt.hash(data.password, 12);
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: UserRole.MANAGER,
        status: UserStatus.ACTIVE,
        companyId: data.companyId,
        managerProfile: {
          create: {
            companyId: data.companyId,
            fullName: data.fullName,
            phone: data.phone,
          },
        },
      },
      include: { managerProfile: true },
    });
  }

  async createForeman(data: {
    email: string;
    password: string;
    companyId: string;
    fullName: string;
    phone?: string;
  }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('Email already exists');
    const passwordHash = await bcrypt.hash(data.password, 12);
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: UserRole.FOREMAN,
        status: UserStatus.ACTIVE,
        companyId: data.companyId,
        foremanProfile: {
          create: {
            companyId: data.companyId,
            fullName: data.fullName,
            phone: data.phone,
          },
        },
      },
      include: { foremanProfile: true },
    });
  }

  private async assertUserInCompany(userId: string, companyId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === UserRole.WORKER) {
      const linked =
        (await this.prisma.workerListEntry.findFirst({
          where: { workerId: userId, companyId },
        })) ??
        (await this.prisma.shiftApplication.findFirst({
          where: { workerId: userId, shift: { companyId } },
        }));
      if (!linked) throw new ForbiddenException('Worker not in company scope');
      return user;
    }

    if (user.companyId !== companyId) {
      throw new ForbiddenException('User not in company scope');
    }
    return user;
  }

  async blockUser(id: string, actor: JwtPayload, companyId: string | null) {
    if (actor.role !== UserRole.SUPERADMIN || companyId) {
      const cid = companyId ?? actor.companyId;
      if (!cid) throw new ForbiddenException('Company context required');
      await this.assertUserInCompany(id, cid);
    } else {
      const user = await this.prisma.user.findUnique({ where: { id } });
      if (!user) throw new NotFoundException('User not found');
    }
    return this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.BLOCKED },
    });
  }

  async unblockUser(id: string, actor: JwtPayload, companyId: string | null) {
    if (actor.role !== UserRole.SUPERADMIN || companyId) {
      const cid = companyId ?? actor.companyId;
      if (!cid) throw new ForbiddenException('Company context required');
      await this.assertUserInCompany(id, cid);
    } else {
      const user = await this.prisma.user.findUnique({ where: { id } });
      if (!user) throw new NotFoundException('User not found');
    }
    return this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.ACTIVE },
    });
  }
}
