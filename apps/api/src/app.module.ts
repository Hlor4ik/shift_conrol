import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'path';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { CompaniesModule } from './companies/companies.module';
import { UsersModule } from './users/users.module';
import { WorkersModule } from './workers/workers.module';
import { ObjectsModule } from './objects/objects.module';
import { ShiftsModule } from './shifts/shifts.module';
import { ApplicationsModule } from './applications/applications.module';
import { AttendanceModule } from './attendance/attendance.module';
import { RatingModule } from './rating/rating.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FilesModule } from './files/files.module';
import { ReportsModule } from './reports/reports.module';
import { ExportModule } from './export/export.module';
import { ImportModule } from './import/import.module';
import { AuditModule } from './audit/audit.module';
import { SettingsModule } from './settings/settings.module';
import { BackupModule } from './backup/backup.module';
import { HealthModule } from './health/health.module';
import { AuditInterceptor } from './audit/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(process.cwd(), '.env'),
        resolve(process.cwd(), '../../.env'),
      ],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
      },
    }),
    // Only "default" is global. Auth/upload limits are set per-route via @Throttle().
    // Named throttlers here would apply to EVERY endpoint and block the admin UI after ~5 req/min.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 300 }]),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      },
    }),
    PrismaModule,
    AuthModule,
    TenancyModule,
    CompaniesModule,
    UsersModule,
    WorkersModule,
    ObjectsModule,
    ShiftsModule,
    ApplicationsModule,
    AttendanceModule,
    RatingModule,
    PaymentsModule,
    NotificationsModule,
    FilesModule,
    ReportsModule,
    ExportModule,
    ImportModule,
    AuditModule,
    SettingsModule,
    BackupModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
