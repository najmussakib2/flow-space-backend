/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';


@Injectable()
export class ProjectsService {
  constructor(private prisma: DatabaseService) {}

  async create(userId: string, dto: CreateProjectDto) {
    const project = await this.prisma.project.create({
      data: {
        workspaceId: dto.workspaceId,
        name: dto.name,
        description: dto.description,
        icon: dto.icon || '📋',
        color: dto.color || '#6366F1',
      },
    });

    // Auto-create default Kanban columns
    await this.prisma.board.createMany({
      data: [
        { projectId: project.id, name: 'Backlog', order: 0, color: '#64748B' },
        { projectId: project.id, name: 'In Progress', order: 1, color: '#6366F1' },
        { projectId: project.id, name: 'In Review', order: 2, color: '#F59E0B' },
        { projectId: project.id, name: 'Done', order: 3, color: '#10B981' },
      ],
    });

    return this.findById(project.id);
  }

  async findByWorkspace(workspaceId: string) {
    return this.prisma.project.findMany({
      where: { workspaceId, deletedAt: null },
      include: {
        _count: { select: { boards: true, documents: true } },
        boards: {
          include: { _count: { select: { tasks: true } } },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id, deletedAt: null },
      include: {
        boards: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              where: { deletedAt: null },
              orderBy: { order: 'asc' },
              include: {
                assignee: { select: { id: true, name: true, avatarUrl: true } },
                creator: { select: { id: true, name: true } },
                labels: true,
                _count: { select: { comments: true, attachments: true } },
              },
            },
          },
        },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    return this.prisma.project.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    await this.prisma.project.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}