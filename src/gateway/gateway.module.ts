import { Module } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { JwtModule } from '@nestjs/jwt';
import { AppGateway } from './app.gateway';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [JwtModule.register({}), RedisModule],
  providers: [AppGateway, GatewayService],
  exports: [GatewayService],
})
export class GatewayModule {}
