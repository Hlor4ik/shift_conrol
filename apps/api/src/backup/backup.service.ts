import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from '../files/files.service';

const execAsync = promisify(exec);

@Injectable()
export class BackupService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private files: FilesService,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    if (process.env.RUN_BACKUP_CRON === 'true') {
      setInterval(() => this.runBackup(), 24 * 60 * 60 * 1000);
    }
  }

  async runBackup() {
    const databaseUrl = this.config.getOrThrow<string>('DATABASE_URL');
    const fileName = `backup-${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8)}.sql`;
    const filePath = join('/tmp', fileName);

    try {
      await execAsync(`pg_dump "${databaseUrl}" -f "${filePath}"`);
      const buffer = await readFile(filePath);
      const file = {
        buffer,
        originalname: fileName,
        mimetype: 'application/sql',
        size: buffer.length,
      } as Express.Multer.File;

      const { key } = await this.files.upload(file, 'backups', { allowAny: true });

      await this.prisma.backupLog.create({
        data: {
          fileName,
          fileKey: key,
          fileSize: BigInt(buffer.length),
          status: 'SUCCESS',
        },
      });

      await unlink(filePath).catch(() => {});
      return { fileName, key };
    } catch (e) {
      await this.prisma.backupLog.create({
        data: {
          fileName,
          fileKey: '',
          fileSize: BigInt(0),
          status: 'FAILED',
          error: e instanceof Error ? e.message : 'Unknown error',
        },
      });
      throw e;
    }
  }

  async listBackups() {
    return this.prisma.backupLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }
}
