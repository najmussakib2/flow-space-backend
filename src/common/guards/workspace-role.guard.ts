/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class WorkspaceRoleGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const workspaceId = request.params.workspaceId || request.body.workspaceId;

    if (!userId || !workspaceId) throw new ForbiddenException('Access denied');

    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!member) throw new ForbiddenException('Not a member of this workspace');

    const hierarchy = { OWNER: 4, ADMIN: 3, MEMBER: 2, GUEST: 1 };
    const userLevel = hierarchy[member.role] || 0;
    const requiredLevel = Math.min(...requiredRoles.map((r) => hierarchy[r] || 0));

    if (userLevel < requiredLevel) throw new ForbiddenException('Insufficient permissions');

    request.workspaceMember = member;
    return true;
  }
}