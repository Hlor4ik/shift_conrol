import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { UserRole } from '@shiftcontrol/database';
import { ImportService } from './import.service';
import { Roles } from '../common/decorators';

@ApiTags('Import')
@Controller('import')
@Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
@ApiBearerAuth()
export class ImportController {
  constructor(private service: ImportService) {}

  @Post('workers')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import workers from Excel' })
  importWorkers(@UploadedFile() file: Express.Multer.File) {
    return this.service.importWorkers(file);
  }
}

import { Module } from '@nestjs/common';

@Module({
  controllers: [ImportController],
  providers: [ImportService],
})
export class ImportModule {}
