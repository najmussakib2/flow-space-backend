/* eslint-disable prettier/prettier */
import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { ChatDto, GenerateSubtasksDto, SummarizeDto } from './dto/ai.dto';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('summarize')
  summarize(@Body() dto: SummarizeDto) { return this.aiService.summarize(dto.content); }

  @Post('generate-subtasks')
  generateSubtasks(@Body() dto: GenerateSubtasksDto) {
    return this.aiService.generateSubtasks(dto.taskTitle, dto.taskDescription);
  }

  @Post('chat')
  chat(@Body() dto: ChatDto) { return this.aiService.chat(dto.message, dto.context); }
}