import { Controller, Post, Delete, Get, Param, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@shiftcontrol/database';
import { ApplicationsService } from './applications.service';
import { Roles } from '../common/decorators';
import { CurrentUser } from '../common/current-user.decorator';
import type { JwtPayload } from '../common/current-user.decorator';
import { TenancyService } from '../tenancy/tenancy.service';

@ApiTags('Applications')
@Controller('shifts/:shiftId')
@ApiBearerAuth()
export class ApplicationsController {
  constructor(
    private service: ApplicationsService,
    private tenancy: TenancyService,
  ) {}

  @Post('apply')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: 'Apply to shift' })
  apply(@CurrentUser() user: JwtPayload, @Param('shiftId') shiftId: string) {
    return this.service.apply(user.sub, shiftId);
  }

  @Delete('apply')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: 'Cancel application' })
  cancel(@CurrentUser() user: JwtPayload, @Param('shiftId') shiftId: string) {
    return this.service.cancel(user.sub, shiftId);
  }

  @Get('applications')
  @Roles(UserRole.SUPERADMIN, UserRole.MANAGER, UserRole.FOREMAN)
  @ApiOperation({ summary: 'List shift applications' })
  list(
    @CurrentUser() user: JwtPayload,
    @Headers('x-company-id') headerCompanyId: string,
    @Param('shiftId') shiftId: string,
  ) {
    const companyId = this.tenancy.resolveCompanyId(user, headerCompanyId);
    return this.service.listByShift(companyId, shiftId);
  }
}

import { Module, forwardRef } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RatingModule } from '../rating/rating.module';

@Module({
  imports: [TenancyModule, forwardRef(() => NotificationsModule), RatingModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
