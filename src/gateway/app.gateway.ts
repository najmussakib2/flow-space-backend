/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import {
  WebSocketGateway, WebSocketServer, OnGatewayInit,
  OnGatewayConnection, OnGatewayDisconnect,
  SubscribeMessage, MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { GatewayService } from './gateway.service';
import config from 'config';

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true },
  namespace: '/ws',
})
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(AppGateway.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private gatewayService: GatewayService,
  ) {}

  afterInit(server: Server) {
    this.gatewayService.setServer(server);
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) { client.disconnect(); return; }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('jwt.accessSecret') ?? config.jwt.accessSecret,
      });

      client.data.userId = payload.sub;
      await this.redisService.setUserOnline(payload.sub, client.id);
      this.logger.debug(`Connected: ${client.id} (${payload.sub})`);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = await this.redisService.setUserOffline(client.id);
    if (userId) this.logger.debug(`Disconnected: ${client.id} (${userId})`);
  }

  @SubscribeMessage('join:workspace')
  async joinWorkspace(@ConnectedSocket() client: Socket, @MessageBody() workspaceId: string) {
    client.join(`workspace:${workspaceId}`);
    client.to(`workspace:${workspaceId}`).emit('member:online', { userId: client.data.userId });
    return { status: 'joined', workspaceId };
  }

  @SubscribeMessage('leave:workspace')
  async leaveWorkspace(@ConnectedSocket() client: Socket, @MessageBody() workspaceId: string) {
    client.leave(`workspace:${workspaceId}`);
    client.to(`workspace:${workspaceId}`).emit('member:offline', { userId: client.data.userId });
  }

  @SubscribeMessage('join:document')
  async joinDocument(@ConnectedSocket() client: Socket, @MessageBody() documentId: string) {
    client.join(`doc:${documentId}`);
    client.to(`doc:${documentId}`).emit('collaborator:joined', {
      userId: client.data.userId,
      socketId: client.id,
    });
  }

  @SubscribeMessage('leave:document')
  async leaveDocument(@ConnectedSocket() client: Socket, @MessageBody() documentId: string) {
    client.leave(`doc:${documentId}`);
    client.to(`doc:${documentId}`).emit('collaborator:left', { userId: client.data.userId });
  }

  @SubscribeMessage('document:update')
  async documentUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { documentId: string; content: any; version: number },
  ) {
    client.to(`doc:${data.documentId}`).emit('document:updated', {
      content: data.content,
      version: data.version,
      userId: client.data.userId,
    });
  }

  @SubscribeMessage('cursor:update')
  async cursorUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { documentId: string; position: any; color: string },
  ) {
    client.to(`doc:${data.documentId}`).emit('cursor:updated', {
      ...data,
      userId: client.data.userId,
    });
  }

  @SubscribeMessage('ping')
  handlePing() {
    return { event: 'pong', data: { ts: Date.now() } };
  }
}