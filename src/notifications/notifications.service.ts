/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { GatewayService } from '../gateway/gateway.service';
import { TaskAssignedEvent, TaskCommentedEvent, TaskMovedEvent } from '../tasks/tasks.events';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: DatabaseService, private gatewayService: GatewayService) {}

  @OnEvent('task.assigned')
  async onTaskAssigned(event: TaskAssignedEvent) {
    if (!event.task.assigneeId || event.task.assigneeId === event.actorId) return;
    const n = await this.prisma.notification.create({
      data: {
        userId: event.task.assigneeId,
        type: 'TASK_ASSIGNED',
        title: 'Task assigned to you',
        body: `"${event.task.title}" was assigned to you`,
        resourceId: event.task.id,
      },
    });
    await this.gatewayService.emitToUser(event.task.assigneeId, 'notification:new', n);
  }

  @OnEvent('task.commented')
  async onTaskCommented(event: TaskCommentedEvent) {
    if (!event.task.assigneeId || event.task.assigneeId === event.actorId) return;
    const n = await this.prisma.notification.create({
      data: {
        userId: event.task.assigneeId,
        type: 'TASK_COMMENTED',
        title: 'New comment on your task',
        body: `Someone commented on "${event.task.title}"`,
        resourceId: event.task.id,
      },
    });
    await this.gatewayService.emitToUser(event.task.assigneeId, 'notification:new', n);
  }

  @OnEvent('task.moved')
  async onTaskMoved(event: TaskMovedEvent) {
    if (!event.task.assigneeId || event.task.assigneeId === event.actorId) return;
    const n = await this.prisma.notification.create({
      data: {
        userId: event.task.assigneeId,
        type: 'TASK_STATUS_CHANGED',
        title: 'Task status updated',
        body: `"${event.task.title}" moved to ${event.task.board?.name}`,
        resourceId: event.task.id,
      },
    });
    await this.gatewayService.emitToUser(event.task.assigneeId, 'notification:new', n);
  }

  async findForUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { data: notifications, meta: { total, page, limit, unreadCount } };
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}