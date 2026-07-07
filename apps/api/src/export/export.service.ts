import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  async exportWorkers(companyId: string | null, format: string, res: Response) {
    const workers = await this.prisma.workerProfile.findMany({
      include: {
        user: { select: { status: true, telegramUsername: true, createdAt: true } },
      },
      orderBy: { fullName: 'asc' },
    });

    if (format === 'csv') {
      const header = 'fullName,phone,city,specialty,rating,totalShifts,status\n';
      const rows = workers
        .map(
          (w) =>
            `"${w.fullName}","${w.phone}","${w.city}","${w.specialty}",${w.rating},${w.totalShifts},"${w.user.status}"`,
        )
        .join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=workers.csv');
      return res.send(header + rows);
    }

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=workers.pdf');
      const doc = new PDFDocument();
      doc.pipe(res);
      doc.fontSize(18).text('Workers Report', { align: 'center' });
      doc.moveDown();
      for (const w of workers) {
        doc.fontSize(10).text(
          `${w.fullName} | ${w.phone} | ${w.city} | Rating: ${w.rating} | Shifts: ${w.totalShifts}`,
        );
      }
      doc.end();
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Workers');
    sheet.columns = [
      { header: 'ФИО', key: 'fullName', width: 30 },
      { header: 'Телефон', key: 'phone', width: 15 },
      { header: 'Город', key: 'city', width: 15 },
      { header: 'Специальность', key: 'specialty', width: 20 },
      { header: 'Рейтинг', key: 'rating', width: 10 },
      { header: 'Смен', key: 'totalShifts', width: 10 },
      { header: 'Статус', key: 'status', width: 12 },
    ];
    workers.forEach((w) =>
      sheet.addRow({
        fullName: w.fullName,
        phone: w.phone,
        city: w.city,
        specialty: w.specialty,
        rating: w.rating,
        totalShifts: w.totalShifts,
        status: w.user.status,
      }),
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename=workers.xlsx');
    await workbook.xlsx.write(res);
  }

  async exportShifts(companyId: string | null, format: string, res: Response) {
    const shifts = await this.prisma.shift.findMany({
      where: companyId ? { companyId } : {},
      include: { object: true, foreman: { include: { foremanProfile: true } } },
      orderBy: { date: 'desc' },
    });

    if (format === 'csv') {
      const header = 'title,date,startTime,endTime,cost,status,object,foreman\n';
      const rows = shifts
        .map(
          (s) =>
            `"${s.title}","${s.date.toISOString().slice(0, 10)}","${s.startTime}","${s.endTime}",${s.cost},"${s.status}","${s.object.name}","${s.foreman?.foremanProfile?.fullName ?? ''}"`,
        )
        .join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=shifts.csv');
      return res.send(header + rows);
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Shifts');
    sheet.columns = [
      { header: 'Название', key: 'title', width: 25 },
      { header: 'Дата', key: 'date', width: 12 },
      { header: 'Начало', key: 'startTime', width: 10 },
      { header: 'Конец', key: 'endTime', width: 10 },
      { header: 'Стоимость', key: 'cost', width: 12 },
      { header: 'Статус', key: 'status', width: 12 },
      { header: 'Объект', key: 'object', width: 20 },
      { header: 'Бригадир', key: 'foreman', width: 20 },
    ];
    shifts.forEach((s) =>
      sheet.addRow({
        title: s.title,
        date: s.date.toISOString().slice(0, 10),
        startTime: s.startTime,
        endTime: s.endTime,
        cost: Number(s.cost),
        status: s.status,
        object: s.object.name,
        foreman: s.foreman?.foremanProfile?.fullName ?? '',
      }),
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename=shifts.xlsx');
    await workbook.xlsx.write(res);
  }

  async exportPayments(companyId: string | null, format: string, res: Response) {
    const payments = await this.prisma.payment.findMany({
      where: companyId ? { shift: { companyId } } : {},
      include: {
        worker: { include: { workerProfile: true } },
        shift: { select: { title: true, date: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (format === 'csv') {
      const header = 'worker,shift,amount,status,paidAt\n';
      const rows = payments
        .map(
          (p) =>
            `"${p.worker.workerProfile?.fullName}","${p.shift.title}",${p.amount},"${p.status}","${p.paidAt?.toISOString() ?? ''}"`,
        )
        .join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=payments.csv');
      return res.send(header + rows);
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Payments');
    sheet.columns = [
      { header: 'Рабочий', key: 'worker', width: 25 },
      { header: 'Смена', key: 'shift', width: 25 },
      { header: 'Сумма', key: 'amount', width: 12 },
      { header: 'Статус', key: 'status', width: 12 },
      { header: 'Дата выплаты', key: 'paidAt', width: 15 },
    ];
    payments.forEach((p) =>
      sheet.addRow({
        worker: p.worker.workerProfile?.fullName,
        shift: p.shift.title,
        amount: Number(p.amount),
        status: p.status,
        paidAt: p.paidAt?.toISOString().slice(0, 10) ?? '',
      }),
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename=payments.xlsx');
    await workbook.xlsx.write(res);
  }
}
