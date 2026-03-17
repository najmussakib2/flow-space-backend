/* eslint-disable prettier/prettier */
// eslint-disable-next-line prettier/prettier
import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';
import { CurrentUser, Roles } from '../common/decorators/public.decorator';
import { WorkspaceRoleGuard } from '../common/guards/workspace-role.guard';
import { CreateWorkspaceDto, InviteMemberDto, UpdateWorkspaceDto } from './dto/workspace.dto';

@ApiTags('Workspaces')
@ApiBearerAuth()
@Controller('workspaces')
export class WorkspacesController {
  constructor(private workspacesService: WorkspacesService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.create(userId, dto);
  }

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.workspacesService.findAllForUser(userId);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string, @CurrentUser('id') userId: string) {
    return this.workspacesService.findBySlug(slug, userId);
  }

  @Patch(':workspaceId')
  @UseGuards(WorkspaceRoleGuard)
  @Roles('ADMIN')
  update(@Param('workspaceId') id: string, @Body() dto: UpdateWorkspaceDto) {
    return this.workspacesService.update(id, dto);
  }

  @Post(':workspaceId/members/invite')
  @UseGuards(WorkspaceRoleGuard)
  @Roles('ADMIN')
  invite(@Param('workspaceId') workspaceId: string, @Body() dto: InviteMemberDto) {
    return this.workspacesService.inviteMember(workspaceId, dto);
  }

  @Delete(':workspaceId/members/:userId')
  @UseGuards(WorkspaceRoleGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser('id') requestingUserId: string,
  ) {
    return this.workspacesService.removeMember(workspaceId, targetUserId, requestingUserId);
  }

  @Delete(':workspaceId')
  @UseGuards(WorkspaceRoleGuard)
  @Roles('OWNER')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('workspaceId') workspaceId: string) {
    return this.workspacesService.delete(workspaceId);
  }
}
