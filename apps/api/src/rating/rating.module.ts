import { Module, forwardRef } from '@nestjs/common';
import { RatingService } from './rating.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [forwardRef(() => SettingsModule)],
  providers: [RatingService],
  exports: [RatingService],
})
export class RatingModule {}
