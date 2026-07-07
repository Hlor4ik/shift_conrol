import { Controller, Get, Post, Patch, Body, Param, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@shiftcontrol/database';
import { UsersService } from './users.service';
import { Roles } from '../common/decorators';
import { CurrentUser } from '../common/current-user.decorator';
import type { JwtPayload } from '../common/current-user.decorator';
import { TenancyService } from '../tenancy/tenancy.service';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateStaffDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsString() @MinLength(8) password!: string;
  @ApiProperty() @IsString() fullName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() companyId?: string;
}

@ApiTags('Users')
@Controller('admin/users')
@Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private service: UsersService,
    private tenancy: TenancyService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List staff users' })
  list(
    @CurrentUser() user: JwtPayload,
    @Headers('x-company-id') headerCompanyId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('role') role?: UserRole,
  ) {
    const companyId = this.tenancy.resolveCompanyId(user, headerCompanyId);
    return this.service.findAll(companyId, parseInt(page, 10), parseInt(limit, 10), role);
  }

  @Post('managers')
  @ApiOperation({ summary: 'Create manager' })
  createManager(
    @CurrentUser() user: JwtPayload,
    @Headers('x-company-id') headerCompanyId: string,
    @Body() dto: CreateStaffDto,
  ) {
    const companyId =
      user.role === UserRole.SUPERADMIN
        ? (dto.companyId ?? this.tenancy.requireCompanyId(user, headerCompanyId))
        : this.tenancy.requireCompanyId(user, headerCompanyId);
    return this.service.createManager({ ...dto, companyId });
  }

  @Post('foremen')
  @ApiOperation({ summary: 'Create foreman' })
  createForeman(
    @CurrentUser() user: JwtPayload,
    @Headers('x-company-id') headerCompanyId: string,
    @Body() dto: CreateStaffDto,
  ) {
    const companyId =
      user.role === UserRole.SUPERADMIN
        ? (dto.companyId ?? this.tenancy.requireCompanyId(user, headerCompanyId))
        : this.tenancy.requireCompanyId(user, headerCompanyId);
    return this.service.createForeman({ ...dto, companyId });
  }

  @Patch(':id/block')
  @ApiOperation({ summary: 'Block user' })
  block(@Param('id') id: string) {
    return this.service.blockUser(id);
  }

  @Patch(':id/unblock')
  @ApiOperation({ summary: 'Unblock user' })
  unblock(@Param('id') id: string) {
    return this.service.unblockUser(id);
  }
}

import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';

@Module({
  imports: [TenancyModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
