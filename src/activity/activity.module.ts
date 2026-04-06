import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { DatabaseModule } from 'src/database/database.module';
import { ActivityController } from './activity.controller';

@Module({
  controllers: [ActivityController],
  imports: [DatabaseModule],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
