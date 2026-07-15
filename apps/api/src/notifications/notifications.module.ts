import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsProcessor } from './notifications.processor';
import { TelegramService } from './telegram.service';
import { AdminAlertsService } from './admin-alerts.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'notifications' })],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsProcessor, TelegramService, AdminAlertsService],
  exports: [NotificationsService, AdminAlertsService],
})
export class NotificationsModule {}
