import { Controller, Get, Query, Res, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { UserRole } from '@shiftcontrol/database';
import { ExportService } from './export.service';
import { Roles } from '../common/decorators';
import { CurrentUser } from '../common/current-user.decorator';
import type { JwtPayload } from '../common/current-user.decorator';
import { TenancyService } from '../tenancy/tenancy.service';

@ApiTags('Export')
@Controller('export')
@Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
@ApiBearerAuth()
export class ExportController {
  constructor(
    private service: ExportService,
    private tenancy: TenancyService,
  ) {}

  @Get('workers')
  @ApiOperation({ summary: 'Export workers' })
  workers(
    @CurrentUser() user: JwtPayload,
    @Headers('x-company-id') headerCompanyId: string,
    @Query('format') format = 'xlsx',
    @Res() res: Response,
  ) {
    const companyId = this.tenancy.resolveCompanyId(user, headerCompanyId);
    return this.service.exportWorkers(companyId, format, res);
  }

  @Get('shifts')
  @ApiOperation({ summary: 'Export shifts' })
  shifts(
    @CurrentUser() user: JwtPayload,
    @Headers('x-company-id') headerCompanyId: string,
    @Query('format') format = 'xlsx',
    @Res() res: Response,
  ) {
    const companyId = this.tenancy.resolveCompanyId(user, headerCompanyId);
    return this.service.exportShifts(companyId, format, res);
  }

  @Get('payments')
  @ApiOperation({ summary: 'Export payments' })
  payments(
    @CurrentUser() user: JwtPayload,
    @Headers('x-company-id') headerCompanyId: string,
    @Query('format') format = 'xlsx',
    @Res() res: Response,
  ) {
    const companyId = this.tenancy.resolveCompanyId(user, headerCompanyId);
    return this.service.exportPayments(companyId, format, res);
  }
}

import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';

@Module({
  imports: [TenancyModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
