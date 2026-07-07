import { Module, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@shiftcontrol/database';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../common/decorators';

@ApiTags('Audit')
@Controller('admin/audit-logs')
@Roles(UserRole.SUPERADMIN)
@ApiBearerAuth()
export class AuditController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs' })
  async list(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('userId') userId?: string,
    @Query('entity') entity?: string,
  ) {
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const where = {
      ...(userId && { userId }),
      ...(entity && { entity }),
    };
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: parseInt(limit, 10),
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, email: true, role: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page: parseInt(page, 10), limit: parseInt(limit, 10) };
  }
}

@Module({
  controllers: [AuditController],
})
export class AuditModule {}
