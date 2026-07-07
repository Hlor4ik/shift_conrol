import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@shiftcontrol/database';
import { BackupService } from './backup.service';
import { Roles } from '../common/decorators';

@ApiTags('Backup')
@Controller('admin/backups')
@Roles(UserRole.SUPERADMIN)
@ApiBearerAuth()
export class BackupController {
  constructor(private service: BackupService) {}

  @Get()
  @ApiOperation({ summary: 'List backups' })
  list() {
    return this.service.listBackups();
  }

  @Post('run')
  @ApiOperation({ summary: 'Run backup now' })
  run() {
    return this.service.runBackup();
  }
}

import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [FilesModule],
  controllers: [BackupController],
  providers: [BackupService],
})
export class BackupModule {}
