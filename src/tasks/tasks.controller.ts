/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CurrentUser } from '../common/decorators/public.decorator';
import { AddCommentDto, CreateTaskDto, MoveTaskDto, UpdateTaskDto } from './dto/tasks.dto';


@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(userId, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, userId, dto);
  }

  @Patch(':id/move')
  move(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: MoveTaskDto) {
    return this.tasksService.move(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.tasksService.delete(id);
  }

  @Post(':id/comments')
  addComment(@Param('id') taskId: string, @CurrentUser('id') userId: string, @Body() dto: AddCommentDto) {
    return this.tasksService.addComment(taskId, userId, dto.content);
  }

  @Delete(':taskId/comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteComment(@Param('commentId') commentId: string, @CurrentUser('id') userId: string) {
    return this.tasksService.deleteComment(commentId, userId);
  }
}