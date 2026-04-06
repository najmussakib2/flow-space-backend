/* eslint-disable prettier/prettier */
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ActivityService } from './activity.service';

@ApiTags('Activity')
@ApiBearerAuth()
@Controller('activity')
export class ActivityController {
  constructor(private activityService: ActivityService) {}

  @Get('project/:projectId')
  getProjectActivity(@Param('projectId') projectId: string, @Query('limit') limit = 30) {
    return this.activityService.getProjectActivity(projectId, +limit);
  }
}