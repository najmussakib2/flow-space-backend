/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateDocumentDto, UpdateDocumentDto } from './dto/document.dto';

@Injectable()
export class DocumentsService {
  constructor(private prisma: DatabaseService) {}

  async create(userId: string, dto: CreateDocumentDto) {
    return this.prisma.document.create({
      data: {
        projectId: dto.projectId,
        authorId: userId,
        title: dto.title || 'Untitled',
        content: { type: 'doc', content: [{ type: 'paragraph' }] },
      },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }

  async findByProject(projectId: string) {
    return this.prisma.document.findMany({
      where: { projectId, deletedAt: null },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findById(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id, deletedAt: null },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async update(id: string, userId: string, dto: UpdateDocumentDto) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    return this.prisma.document.update({ where: { id }, data: dto });
  }

  async delete(id: string, userId: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.authorId !== userId) throw new ForbiddenException('Only the author can delete this');
    await this.prisma.document.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
