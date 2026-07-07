import { Controller, Get, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@shiftcontrol/database';
import { ReportsService } from './reports.service';
import { Roles } from '../common/decorators';
import { CurrentUser } from '../common/current-user.decorator';
import type { JwtPayload } from '../common/current-user.decorator';
import { TenancyService } from '../tenancy/tenancy.service';

@ApiTags('Reports')
@Controller('reports')
@Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
@ApiBearerAuth()
export class ReportsController {
  constructor(
    private service: ReportsService,
    private tenancy: TenancyService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard statistics' })
  dashboard(
    @CurrentUser() user: JwtPayload,
    @Headers('x-company-id') headerCompanyId: string,
  ) {
    const companyId = this.tenancy.resolveCompanyId(user, headerCompanyId);
    return this.service.getDashboard(companyId);
  }
}

import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';

@Module({
  imports: [TenancyModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
