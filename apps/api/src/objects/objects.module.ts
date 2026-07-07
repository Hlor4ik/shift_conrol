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
import { UserRole } from '@shiftcontrol/database';
import { ObjectsService } from './objects.service';
import { Roles } from '../common/decorators';
import { CurrentUser } from '../common/current-user.decorator';
import type { JwtPayload } from '../common/current-user.decorator';
import { TenancyService } from '../tenancy/tenancy.service';
import { IsString, IsOptional, IsNumber, IsBoolean, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ObjectDto {
  @ApiProperty() @IsString() @MinLength(2) name!: string;
  @ApiProperty() @IsString() @MinLength(5) address!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

@ApiTags('Objects')
@Controller('objects')
@Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
@ApiBearerAuth()
export class ObjectsController {
  constructor(
    private service: ObjectsService,
    private tenancy: TenancyService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List objects' })
  list(
    @CurrentUser() user: JwtPayload,
    @Headers('x-company-id') headerCompanyId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('activeOnly') activeOnly = 'true',
  ) {
    const companyId = this.tenancy.requireCompanyId(user, headerCompanyId);
    return this.service.findAll(
      companyId,
      parseInt(page, 10),
      parseInt(limit, 10),
      activeOnly === 'true',
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get object' })
  get(
    @CurrentUser() user: JwtPayload,
    @Headers('x-company-id') headerCompanyId: string,
    @Param('id') id: string,
  ) {
    const companyId = this.tenancy.resolveCompanyId(user, headerCompanyId);
    return this.service.findOne(companyId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create object' })
  create(
    @CurrentUser() user: JwtPayload,
    @Headers('x-company-id') headerCompanyId: string,
    @Body() dto: ObjectDto,
  ) {
    const companyId = this.tenancy.requireCompanyId(user, headerCompanyId);
    return this.service.create(companyId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update object' })
  update(
    @CurrentUser() user: JwtPayload,
    @Headers('x-company-id') headerCompanyId: string,
    @Param('id') id: string,
    @Body() dto: Partial<ObjectDto & { isActive: boolean }>,
  ) {
    const companyId = this.tenancy.requireCompanyId(user, headerCompanyId);
    return this.service.update(companyId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate object' })
  remove(
    @CurrentUser() user: JwtPayload,
    @Headers('x-company-id') headerCompanyId: string,
    @Param('id') id: string,
  ) {
    const companyId = this.tenancy.requireCompanyId(user, headerCompanyId);
    return this.service.remove(companyId, id);
  }
}

import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';

@Module({
  imports: [TenancyModule],
  controllers: [ObjectsController],
  providers: [ObjectsService],
  exports: [ObjectsService],
})
export class ObjectsModule {}
