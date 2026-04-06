/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TaskCreatedEvent, TaskMovedEvent, TaskCommentedEvent } from '../tasks/tasks.events';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class ActivityService {
  constructor(private prisma: DatabaseService) {}

  async log(data: { userId: string; projectId?: string; taskId?: string; action: string; metadata?: any }) {
    return this.prisma.activityLog.create({ data });
  }

  @OnEvent('task.created')
  async onTaskCreated(event: TaskCreatedEvent) {
    await this.log({ userId: event.actorId, taskId: event.task.id, action: 'task.created', metadata: { title: event.task.title } });
  }

  @OnEvent('task.moved')
  async onTaskMoved(event: TaskMovedEvent) {
    await this.log({
      userId: event.actorId, taskId: event.task.id, action: 'task.moved',
      metadata: { title: event.task.title, from: event.fromBoardId, to: event.task.board?.name },
    });
  }

  @OnEvent('task.commented')
  async onTaskCommented(event: TaskCommentedEvent) {
    await this.log({ userId: event.actorId, taskId: event.task.id, action: 'task.commented', metadata: { title: event.task.title } });
  }

   async getProjectActivity(projectId: string, limit = 30) {
    return this.prisma.activityLog.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}