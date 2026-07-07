import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole, AttendanceStatus } from '@shiftcontrol/database';
import { AttendanceService } from './attendance.service';
import { ShiftsService } from '../shifts/shifts.service';
import { Roles } from '../common/decorators';
import { CurrentUser } from '../common/current-user.decorator';
import type { JwtPayload } from '../common/current-user.decorator';
import {
  IsString,
  IsArray,
  ValidateNested,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class AttendanceItemDto {
  @ApiProperty() @IsString() applicationId!: string;
  @ApiProperty({ enum: AttendanceStatus }) @IsEnum(AttendanceStatus) status!: AttendanceStatus;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) @Max(5) stars?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBestWorker?: boolean;
}

class AttendanceBatchDto {
  @ApiProperty() @IsString() shiftId!: string;
  @ApiProperty({ type: [AttendanceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceItemDto)
  items!: AttendanceItemDto[];
}

class QrCheckInDto {
  @ApiProperty() @IsString() shiftId!: string;
  @ApiProperty() @IsString() token!: string;
}

class GpsCheckInDto {
  @ApiProperty() @IsString() shiftId!: string;
  @ApiProperty() @IsNumber() latitude!: number;
  @ApiProperty() @IsNumber() longitude!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() accuracy?: number;
}

@ApiTags('Attendance')
@Controller()
@ApiBearerAuth()
export class AttendanceController {
  constructor(
    private service: AttendanceService,
    private shiftsService: ShiftsService,
  ) {}

  @Post('foreman/attendance')
  @Roles(UserRole.FOREMAN)
  @ApiOperation({ summary: 'Submit attendance batch' })
  submitBatch(@CurrentUser() user: JwtPayload, @Body() dto: AttendanceBatchDto) {
    return this.service.submitBatch(user.sub, dto.shiftId, dto.items);
  }

  @Get('foreman/shifts/:shiftId/qr')
  @Roles(UserRole.FOREMAN)
  @ApiOperation({ summary: 'Get shift QR token' })
  getQr(@CurrentUser() user: JwtPayload, @Param('shiftId') shiftId: string) {
    return this.service.getShiftQr(shiftId, user.sub);
  }

  @Get('foreman/shifts')
  @Roles(UserRole.FOREMAN)
  @ApiOperation({ summary: 'Foreman shifts' })
  foremanShifts(@CurrentUser() user: JwtPayload) {
    return this.shiftsService.getForemanShifts(user.sub);
  }

  @Post('checkin/qr')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: 'QR check-in' })
  qrCheckIn(@CurrentUser() user: JwtPayload, @Body() dto: QrCheckInDto) {
    return this.service.qrCheckIn(user.sub, dto.shiftId, dto.token);
  }

  @Post('checkin/gps')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: 'GPS check-in' })
  gpsCheckIn(@CurrentUser() user: JwtPayload, @Body() dto: GpsCheckInDto) {
    return this.service.gpsCheckIn(
      user.sub,
      dto.shiftId,
      dto.latitude,
      dto.longitude,
      dto.accuracy,
    );
  }
}

import { Module, forwardRef } from '@nestjs/common';
import { RatingModule } from '../rating/rating.module';
import { PaymentsModule } from '../payments/payments.module';
import { ShiftsModule } from '../shifts/shifts.module';

@Module({
  imports: [RatingModule, PaymentsModule, forwardRef(() => ShiftsModule)],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
