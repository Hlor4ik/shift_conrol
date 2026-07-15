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
import { UserRole, WorkerListType } from '@shiftcontrol/database';
import { WorkersService } from './workers.service';
import { Roles } from '../common/decorators';
import { CurrentUser } from '../common/current-user.decorator';
import type { JwtPayload } from '../common/current-user.decorator';
import { TenancyService } from '../tenancy/tenancy.service';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  IsEnum,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class RegisterWorkerDto {
  @ApiProperty() @IsString() @MinLength(2) fullName!: string;
  @ApiProperty() @IsString() phone!: string;
  @ApiProperty() @IsString() birthDate!: string;
  @ApiProperty() @IsString() city!: string;
  @ApiProperty() @IsString() specialty!: string;
  @ApiProperty() @IsNumber() @Min(0) @Max(50) experience!: number;
  @ApiPropertyOptional() @IsOptional() @IsObject() bankDetails?: Record<string, string>;
}

class UpdateWorkerMeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) fullName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() birthDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() specialty?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(50) experience?: number;
  @ApiPropertyOptional() @IsOptional() @IsObject() bankDetails?: Record<string, string>;
  @ApiPropertyOptional() @IsOptional() @IsString() photoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() documentPhotoUrl?: string;
}

class UpdateRatingDto {
  @ApiProperty() @IsNumber() @Min(0) @Max(200) rating!: number;
}

class WorkerListDto {
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

class RejectWorkerDto {
  @ApiProperty() @IsString() @MinLength(3) reason!: string;
}

@ApiTags('Workers')
@Controller('workers')
@ApiBearerAuth()
export class WorkersController {
  constructor(
    private service: WorkersService,
    private tenancy: TenancyService,
  ) {}

  @Post('register')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: 'Register worker profile' })
  register(@CurrentUser() user: JwtPayload, @Body() dto: RegisterWorkerDto) {
    return this.service.register(user.sub, dto);
  }

  @Get('me')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: 'Get my profile' })
  getMe(@CurrentUser() user: JwtPayload) {
    return this.service.getMe(user.sub);
  }

  @Patch('me')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: 'Update my profile' })
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateWorkerMeDto) {
    return this.service.updateMe(user.sub, dto);
  }

  @Get('me/dashboard')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: 'Worker dashboard' })
  dashboard(@CurrentUser() user: JwtPayload) {
    return this.service.getDashboard(user.sub);
  }

  @Get('me/shifts')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: 'My shifts' })
  myShifts(@CurrentUser() user: JwtPayload, @Query('upcoming') upcoming = 'true') {
    return this.service.getMyShifts(user.sub, upcoming === 'true');
  }

  @Get('me/payments')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: 'My payments' })
  myPayments(@CurrentUser() user: JwtPayload) {
    return this.service.getMyPayments(user.sub);
  }

  @Get('verification/pending')
  @Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Workers awaiting verification' })
  listPending(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.service.listPendingVerification(parseInt(page, 10), parseInt(limit, 10));
  }

  @Get()
  @Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Search workers' })
  search(
    @Query('search') search?: string,
    @Query('city') city?: string,
    @Query('specialty') specialty?: string,
    @Query('minRating') minRating?: string,
    @Query('maxRating') maxRating?: string,
    @Query('status') status?: 'ACTIVE' | 'BLOCKED' | 'PENDING_VERIFICATION',
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.service.search({
      search,
      city,
      specialty,
      minRating: minRating ? parseFloat(minRating) : undefined,
      maxRating: maxRating ? parseFloat(maxRating) : undefined,
      status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  @Get(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get worker' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/verify')
  @Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Approve worker account and document' })
  verify(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.verifyWorker(id, user.sub);
  }

  @Post(':id/reject')
  @Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Reject worker document' })
  reject(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RejectWorkerDto,
  ) {
    return this.service.rejectWorker(id, user.sub, dto.reason);
  }

  @Patch(':id/rating')
  @Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Manually adjust rating' })
  updateRating(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateRatingDto,
  ) {
    return this.service.updateRating(id, dto.rating, user.sub);
  }

  @Post(':id/lists/:listType')
  @Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Add worker to list' })
  addToList(
    @Param('id') workerId: string,
    @Param('listType') listType: WorkerListType,
    @CurrentUser() user: JwtPayload,
    @Headers('x-company-id') headerCompanyId: string,
    @Body() dto: WorkerListDto,
  ) {
    const companyId = this.tenancy.requireCompanyId(user, headerCompanyId);
    return this.service.addToList(companyId, workerId, listType, user.sub, dto.reason);
  }

  @Delete(':id/lists/:listType')
  @Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Remove worker from list' })
  removeFromList(
    @Param('id') workerId: string,
    @Param('listType') listType: WorkerListType,
    @CurrentUser() user: JwtPayload,
    @Headers('x-company-id') headerCompanyId: string,
  ) {
    const companyId = this.tenancy.requireCompanyId(user, headerCompanyId);
    return this.service.removeFromList(companyId, workerId, listType);
  }
}

import { Module, forwardRef } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TenancyModule, forwardRef(() => NotificationsModule)],
  controllers: [WorkersController],
  providers: [WorkersService],
  exports: [WorkersService],
})
export class WorkersModule {}
