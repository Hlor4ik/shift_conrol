import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Param,
  Headers,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole, DocumentVerificationStatus, UserStatus } from '@shiftcontrol/database';
import { FilesService } from './files.service';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../common/decorators';
import { CurrentUser } from '../common/current-user.decorator';
import type { JwtPayload } from '../common/current-user.decorator';
import { TenancyService } from '../tenancy/tenancy.service';
import { ObjectsService } from '../objects/objects.service';
import { ShiftsService } from '../shifts/shifts.service';
import { AdminAlertsService } from '../notifications/admin-alerts.service';

@ApiTags('Files')
@Controller('files')
@ApiBearerAuth()
export class FilesController {
  constructor(
    private files: FilesService,
    private prisma: PrismaService,
    private tenancy: TenancyService,
    private objects: ObjectsService,
    private shifts: ShiftsService,
    private adminAlerts: AdminAlertsService,
  ) {}

  @Post('upload')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload file' })
  async upload(@UploadedFile() file: Express.Multer.File) {
    return this.files.upload(file, 'uploads');
  }

  @Post('workers/me/document')
  @Roles(UserRole.WORKER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload worker document' })
  async workerDocument(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const { url, key } = await this.files.upload(file, 'documents');
    await this.prisma.workerDocument.create({
      data: {
        workerId: user.sub,
        url,
        key,
        fileName: file.originalname,
        status: DocumentVerificationStatus.PENDING,
      },
    });
    await this.prisma.workerProfile.update({
      where: { userId: user.sub },
      data: { documentPhotoUrl: url },
    });
    const workerUser = await this.prisma.user.findUnique({ where: { id: user.sub } });
    if (workerUser && workerUser.status !== UserStatus.ACTIVE) {
      await this.prisma.user.update({
        where: { id: user.sub },
        data: { status: UserStatus.PENDING_VERIFICATION },
      });
    }
    void this.adminAlerts.notifyDocumentUploaded(user.sub, file.originalname);
    return { url, key, status: 'PENDING' };
  }

  @Post('objects/:id/photos')
  @Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload object photo' })
  async objectPhoto(
    @CurrentUser() user: JwtPayload,
    @Headers('x-company-id') headerCompanyId: string,
    @Param('id') objectId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const companyId = this.tenancy.requireCompanyId(user, headerCompanyId);
    await this.objects.findOne(companyId, objectId);
    const { url, key } = await this.files.upload(file, 'objects');
    return this.objects.addPhoto(objectId, url, key);
  }

  @Post('shifts/:id/photos')
  @Roles(UserRole.SUPERADMIN, UserRole.MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload shift photo' })
  async shiftPhoto(
    @CurrentUser() user: JwtPayload,
    @Headers('x-company-id') headerCompanyId: string,
    @Param('id') shiftId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const companyId = this.tenancy.requireCompanyId(user, headerCompanyId);
    await this.shifts.findOne(companyId, shiftId);
    const { url, key } = await this.files.upload(file, 'shifts');
    return this.shifts.addPhoto(shiftId, url, key);
  }
}

import { Module, forwardRef } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';
import { ObjectsModule } from '../objects/objects.module';
import { ShiftsModule } from '../shifts/shifts.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TenancyModule, ObjectsModule, ShiftsModule, forwardRef(() => NotificationsModule)],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
