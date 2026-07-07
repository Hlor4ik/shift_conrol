import { Controller, Get, Patch, Body, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@shiftcontrol/database';
import { SettingsService } from './settings.service';
import { Roles } from '../common/decorators';
import { CurrentUser } from '../common/current-user.decorator';
import type { JwtPayload } from '../common/current-user.decorator';
import { TenancyService } from '../tenancy/tenancy.service';
import { IsObject, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class UpdateSettingDto {
  @ApiProperty() @IsString() key!: string;
  @ApiProperty() @IsObject() value!: Record<string, unknown>;
}

@ApiTags('Settings')
@Controller('admin/settings')
@Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
@ApiBearerAuth()
export class SettingsController {
  constructor(
    private service: SettingsService,
    private tenancy: TenancyService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get settings' })
  getAll(@CurrentUser() user: JwtPayload, @Headers('x-company-id') headerCompanyId: string) {
    const companyId = this.tenancy.resolveCompanyId(user, headerCompanyId);
    return this.service.getAll(companyId);
  }

  @Get('rating-rules')
  @ApiOperation({ summary: 'Get rating rules' })
  getRatingRules(@CurrentUser() user: JwtPayload, @Headers('x-company-id') headerCompanyId: string) {
    const companyId = this.tenancy.resolveCompanyId(user, headerCompanyId);
    return this.service.getRatingRules(companyId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update setting' })
  update(
    @CurrentUser() user: JwtPayload,
    @Headers('x-company-id') headerCompanyId: string,
    @Body() dto: UpdateSettingDto,
  ) {
    const companyId = this.tenancy.resolveCompanyId(user, headerCompanyId);
    return this.service.set(dto.key, dto.value, companyId);
  }
}

import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';

@Module({
  imports: [TenancyModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
