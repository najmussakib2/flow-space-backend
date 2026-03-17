/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { WorkspaceRole } from 'generated/prisma/enums';
import { DatabaseService } from 'src/database/database.service';
import { CreateWorkspaceDto, InviteMemberDto, UpdateWorkspaceDto } from './dto/workspace.dto';


@Injectable()
export class WorkspacesService {
  constructor(private prisma: DatabaseService) {}

  async create(userId: string, dto: CreateWorkspaceDto) {
    const existing = await this.prisma.workspace.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Slug already taken');

    return this.prisma.workspace.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        members: { create: { userId, role: WorkspaceRole.OWNER } },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
      },
    });
  }

  async findAllForUser(userId: string) {
    return this.prisma.workspace.findMany({
      where: { deletedAt: null, members: { some: { userId } } },
      include: {
        _count: { select: { members: true, projects: true } },
        members: { where: { userId }, select: { role: true } },
      },
    });
  }

  async findBySlug(slug: string, userId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { slug, deletedAt: null },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        projects: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    const isMember = workspace.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('Not a member of this workspace');
    return workspace;
  }

  async update(workspaceId: string, dto: UpdateWorkspaceDto) {
    return this.prisma.workspace.update({ where: { id: workspaceId }, data: dto });
  }

  async inviteMember(workspaceId: string, dto: InviteMemberDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      const alreadyMember = await this.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: existingUser.id } },
      });
      if (alreadyMember) throw new ConflictException('User is already a member');
      return this.prisma.workspaceMember.create({
        data: { workspaceId, userId: existingUser.id, role: dto.role },
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      });
    }
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    return this.prisma.workspaceInvite.create({
      data: { workspaceId, email: dto.email, role: dto.role, expiresAt },
    });
  }

  async removeMember(workspaceId: string, targetUserId: string, requestingUserId: string) {
    const requester = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: requestingUserId } },
    });
    if (!requester || !['OWNER', 'ADMIN'].includes(requester.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    if (targetUserId === requestingUserId && requester.role === 'OWNER') {
      throw new BadRequestException('Owner cannot leave the workspace');
    }
    await this.prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    });
  }

  async delete(workspaceId: string) {
    await this.prisma.workspace.update({ where: { id: workspaceId }, data: { deletedAt: new Date() } });
  }
}