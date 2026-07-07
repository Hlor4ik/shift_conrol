import { Controller, Get, Patch, Post, Body, Param, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole, PaymentStatus } from '@shiftcontrol/database';
import { PaymentsService } from './payments.service';
import { Roles } from '../common/decorators';
import { CurrentUser } from '../common/current-user.decorator';
import type { JwtPayload } from '../common/current-user.decorator';
import { TenancyService } from '../tenancy/tenancy.service';
import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class UpdatePaymentDto {
  @ApiProperty({ enum: PaymentStatus }) @IsEnum(PaymentStatus) status!: PaymentStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() paidAt?: string;
}

@ApiTags('Payments')
@Controller('payments')
@ApiBearerAuth()
export class PaymentsController {
  constructor(
    private service: PaymentsService,
    private tenancy: TenancyService,
  ) {}

  @Get()
  @Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List payments' })
  list(
    @CurrentUser() user: JwtPayload,
    @Headers('x-company-id') headerCompanyId: string,
    @Query('workerId') workerId?: string,
    @Query('shiftId') shiftId?: string,
    @Query('status') status?: PaymentStatus,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const companyId = this.tenancy.resolveCompanyId(user, headerCompanyId);
    return this.service.findAll(companyId, {
      workerId,
      shiftId,
      status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  @Patch(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update payment' })
  update(@Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    return this.service.update(id, {
      status: dto.status,
      comment: dto.comment,
      paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
    });
  }

  @Post('bulk/:shiftId')
  @Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Bulk create payments for shift' })
  bulk(@Param('shiftId') shiftId: string) {
    return this.service.bulkCreateForShift(shiftId);
  }
}

import { Module, forwardRef } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TenancyModule, forwardRef(() => NotificationsModule)],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
