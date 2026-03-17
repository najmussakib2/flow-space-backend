/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class GatewayService {
  private server: Server;

  constructor(private redisService: RedisService) {}

  setServer(server: Server) { this.server = server; }

  async emitToUser(userId: string, event: string, data: any) {
    const socketIds = await this.redisService.getUserSockets(userId);
    socketIds.forEach((id) => this.server?.to(id).emit(event, data));
  }

  async emitToWorkspace(workspaceId: string, event: string, data: any) {
    this.server?.to(`workspace:${workspaceId}`).emit(event, data);
  }
}