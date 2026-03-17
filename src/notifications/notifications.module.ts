import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { GatewayModule } from 'src/gateway/gateway.module';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  imports: [GatewayModule, DatabaseModule],
})
export class NotificationsModule {}
