import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole, ShiftStatus } from '@shiftcontrol/database';
import { ShiftsService } from './shifts.service';
import { Roles } from '../common/decorators';
import { CurrentUser } from '../common/current-user.decorator';
import type { JwtPayload } from '../common/current-user.decorator';
import { TenancyService } from '../tenancy/tenancy.service';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateShiftDto {
  @ApiProperty() @IsString() objectId!: string;
  @ApiProperty() @IsString() @MinLength(2) title!: string;
  @ApiProperty() @IsString() address!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
  @ApiProperty() @IsString() date!: string;
  @ApiProperty() @IsString() startTime!: string;
  @ApiProperty() @IsString() endTime!: string;
  @ApiProperty() @IsNumber() @Min(0) cost!: number;
  @ApiProperty() @IsNumber() @Min(1) maxWorkers!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() requirements?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() minRating?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() registrationDeadline?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() foremanId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() gpsRadiusMeters?: number;
}

@ApiTags('Shifts')
@Controller('shifts')
@ApiBearerAuth()
export class ShiftsController {
  constructor(
    private service: ShiftsService,
    private tenancy: TenancyService,
  ) {}

  @Get('available')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: 'Available shifts for worker' })
  available(
    @CurrentUser() user: JwtPayload,
    @Query('city') city?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.service.findAvailableForWorker(
      user.sub,
      city,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Get()
  @Roles(UserRole.SUPERADMIN, UserRole.MANAGER, UserRole.FOREMAN)
  @ApiOperation({ summary: 'List shifts' })
  list(
    @CurrentUser() user: JwtPayload,
    @Headers('x-company-id') headerCompanyId: string,
    @Query('objectId') objectId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('foremanId') foremanId?: string,
    @Query('status') status?: ShiftStatus,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const companyId = this.tenancy.resolveCompanyId(user, headerCompanyId);
    const filters = {
      objectId,
      dateFrom,
      dateTo,
      foremanId: user.role === UserRole.FOREMAN ? user.sub : foremanId,
      status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    };
    return this.service.findAll(companyId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shift details' })
  get(
    @CurrentUser() user: JwtPayload,
    @Headers('x-company-id') headerCompanyId: string,
    @Param('id') id: string,
  ) {
    if (user.role === UserRole.WORKER) {
      return this.service.findOneForWorker(id, user.sub);
    }
    const companyId = this.tenancy.resolveCompanyId(user, headerCompanyId);
    return this.service.findOne(companyId, id);
  }

  @Post()
  @Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create shift' })
  create(
    @CurrentUser() user: JwtPayload,
    @Headers('x-company-id') headerCompanyId: string,
    @Body() dto: CreateShiftDto,
  ) {
    const companyId = this.tenancy.requireCompanyId(user, headerCompanyId);
    return this.service.create(companyId, user.sub, dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update shift' })
  update(
    @CurrentUser() user: JwtPayload,
    @Headers('x-company-id') headerCompanyId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateShiftDto>,
  ) {
    const companyId = this.tenancy.requireCompanyId(user, headerCompanyId);
    return this.service.update(companyId, id, user.sub, dto);
  }

  @Post(':id/publish')
  @Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Publish shift' })
  publish(
    @CurrentUser() user: JwtPayload,
    @Headers('x-company-id') headerCompanyId: string,
    @Param('id') id: string,
  ) {
    const companyId = this.tenancy.requireCompanyId(user, headerCompanyId);
    return this.service.publish(companyId, id);
  }

  @Post(':id/cancel')
  @Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Cancel shift' })
  cancel(
    @CurrentUser() user: JwtPayload,
    @Headers('x-company-id') headerCompanyId: string,
    @Param('id') id: string,
  ) {
    const companyId = this.tenancy.requireCompanyId(user, headerCompanyId);
    return this.service.cancel(companyId, id);
  }

  @Post(':id/start')
  @Roles(UserRole.FOREMAN, UserRole.MANAGER, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Start shift' })
  start(
    @CurrentUser() user: JwtPayload,
    @Headers('x-company-id') headerCompanyId: string,
    @Param('id') id: string,
  ) {
    const companyId = this.tenancy.requireCompanyId(user, headerCompanyId);
    return this.service.startShift(companyId, id);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete shift' })
  remove(
    @CurrentUser() user: JwtPayload,
    @Headers('x-company-id') headerCompanyId: string,
    @Param('id') id: string,
  ) {
    const companyId = this.tenancy.requireCompanyId(user, headerCompanyId);
    return this.service.remove(companyId, id);
  }
}

import { Module, forwardRef } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ApplicationsModule } from '../applications/applications.module';

@Module({
  imports: [TenancyModule, forwardRef(() => NotificationsModule), ApplicationsModule],
  controllers: [ShiftsController],
  providers: [ShiftsService],
  exports: [ShiftsService],
})
export class ShiftsModule {}
