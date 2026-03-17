/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TaskCreatedEvent, TaskMovedEvent, TaskAssignedEvent, TaskCommentedEvent } from './tasks.events';
import { DatabaseService } from 'src/database/database.service';
import { Priority, TaskStatus } from 'generated/prisma/enums';
import { CreateTaskDto, MoveTaskDto, UpdateTaskDto } from './dto/tasks.dto';


@Injectable()
export class TasksService {
  constructor(private prisma: DatabaseService, private eventEmitter: EventEmitter2) {}

  async create(userId: string, dto: CreateTaskDto) {
    const maxOrder = await this.prisma.task.findFirst({
      where: { boardId: dto.boardId, deletedAt: null },
      orderBy: { order: 'desc' },
    });
    const order = (maxOrder?.order || 0) + 1000;

    const task = await this.prisma.task.create({
      data: {
        boardId: dto.boardId,
        creatorId: userId,
        assigneeId: dto.assigneeId,
        title: dto.title,
        description: dto.description,
        priority: dto.priority || Priority.MEDIUM,
        status: TaskStatus.TODO,
        order,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
      include: this.includes(),
    });

    this.eventEmitter.emit('task.created', new TaskCreatedEvent(task, userId));
    if (dto.assigneeId && dto.assigneeId !== userId) {
      this.eventEmitter.emit('task.assigned', new TaskAssignedEvent(task, userId));
    }
    return task;
  }

  async findById(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id, deletedAt: null },
      include: {
        ...this.includes(),
        comments: {
          where: { deletedAt: null },
          include: { author: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'asc' },
        },
        attachments: true,
        activities: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async update(id: string, userId: string, dto: UpdateTaskDto) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task not found');

    const task = await this.prisma.task.update({
      where: { id },
      data: { ...dto, dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined },
      include: this.includes(),
    });

    if (dto.assigneeId && dto.assigneeId !== existing.assigneeId && dto.assigneeId !== userId) {
      this.eventEmitter.emit('task.assigned', new TaskAssignedEvent(task, userId));
    }
    return task;
  }

  async move(id: string, userId: string, dto: MoveTaskDto) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task not found');

    const fromBoardId = existing.boardId;
    const task = await this.prisma.task.update({
      where: { id },
      data: { boardId: dto.targetBoardId, order: dto.order },
      include: this.includes(),
    });

    this.eventEmitter.emit('task.moved', new TaskMovedEvent(task, fromBoardId, userId));
    return task;
  }

  async delete(id: string) {
    await this.prisma.task.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async addComment(taskId: string, userId: string, content: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    const comment = await this.prisma.comment.create({
      data: { taskId, authorId: userId, content },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });

    this.eventEmitter.emit('task.commented', new TaskCommentedEvent(task, comment, userId));
    return comment;
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) throw new ForbiddenException('Cannot delete others\' comments');
    return this.prisma.comment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
  }

  private includes() {
    return {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      creator: { select: { id: true, name: true, avatarUrl: true } },
      labels: true,
      board: { select: { id: true, name: true, color: true } },
      _count: { select: { comments: true, attachments: true } },
    };
  }
}