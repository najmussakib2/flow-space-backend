/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsDateString } from 'class-validator';
import { Priority } from 'generated/prisma/client';
import { TaskStatus } from 'generated/prisma/enums';

export class CreateTaskDto {
  @ApiProperty() @IsString() boardId: string;
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsOptional() @IsString() assigneeId?: string;
  @ApiProperty() @IsOptional() @IsEnum(Priority) priority?: Priority;
  @ApiProperty() @IsOptional() @IsDateString() dueDate?: string;
}

export class UpdateTaskDto {
  @ApiProperty() @IsOptional() @IsString() title?: string;
  @ApiProperty() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsOptional() @IsString() assigneeId?: string;
  @ApiProperty() @IsOptional() @IsEnum(Priority) priority?: Priority;
  @ApiProperty() @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;
  @ApiProperty() @IsOptional() @IsDateString() dueDate?: string;
}

export class MoveTaskDto {
  @ApiProperty() @IsString() targetBoardId: string;
  @ApiProperty() @IsNumber() order: number;
}

export class AddCommentDto { 
  @ApiProperty()  @IsString() content: string; 
}