import { Injectable, BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { UserRole, UserStatus } from '@shiftcontrol/database';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ImportService {
  constructor(private prisma: PrismaService) {}

  async importWorkers(file: Express.Multer.File) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as unknown as ExcelJS.Buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('Empty spreadsheet');

    const results = { created: 0, skipped: 0, errors: [] as string[] };
    const headerRow = sheet.getRow(1);
    const headers: Record<string, number> = {};
    headerRow.eachCell((cell, col) => {
      headers[String(cell.value).toLowerCase()] = col;
    });

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const fullName = String(row.getCell(headers['фио'] ?? headers['fullname'] ?? 1).value ?? '');
      const phone = String(row.getCell(headers['телефон'] ?? headers['phone'] ?? 2).value ?? '');
      const city = String(row.getCell(headers['город'] ?? headers['city'] ?? 3).value ?? '');
      const specialty = String(
        row.getCell(headers['специальность'] ?? headers['specialty'] ?? 4).value ?? '',
      );

      if (!fullName || !phone) {
        results.skipped++;
        continue;
      }

      try {
        const user = await this.prisma.user.create({
          data: {
            role: UserRole.WORKER,
            status: UserStatus.ACTIVE,
            workerProfile: {
              create: {
                fullName,
                phone,
                city: city || 'Не указан',
                specialty: specialty || 'Разнорабочий',
                birthDate: new Date('1990-01-01'),
                experience: 0,
              },
            },
          },
        });
        results.created++;
        void user;
      } catch (e) {
        results.errors.push(`Row ${i}: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }
    return results;
  }
}
