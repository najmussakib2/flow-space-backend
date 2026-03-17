import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
