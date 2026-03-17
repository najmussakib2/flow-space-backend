/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class SearchService {
  constructor(private prisma: DatabaseService) {}

  async search(query: string, workspaceId: string) {
    if (!query || query.trim().length < 2) return { tasks: [], documents: [], projects: [] };
    const q = query.trim();

    const [tasks, documents, projects] = await Promise.all([
      this.prisma.task.findMany({
        where: { deletedAt: null, title: { contains: q, mode: 'insensitive' }, board: { project: { workspaceId } } },
        include: {
          board: { select: { name: true, project: { select: { name: true, id: true } } } },
          assignee: { select: { id: true, name: true, avatarUrl: true } },
        },
        take: 10,
      }),
      this.prisma.document.findMany({
        where: { deletedAt: null, title: { contains: q, mode: 'insensitive' }, project: { workspaceId } },
        include: { project: { select: { id: true, name: true } } },
        take: 5,
      }),
      this.prisma.project.findMany({
        where: { deletedAt: null, workspaceId, name: { contains: q, mode: 'insensitive' } },
        take: 5,
      }),
    ]);

    return { tasks, documents, projects };
  }
}