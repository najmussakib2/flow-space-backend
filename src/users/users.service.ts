/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: DatabaseService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true, email: true, name: true, avatarUrl: true,
        isVerified: true, provider: true, createdAt: true,
        memberships: {
          include: {
            workspace: { select: { id: true, name: true, slug: true, logoUrl: true } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: { id: true, email: true, name: true, avatarUrl: true },
    });
  }

  async deleteAccount(id: string) {
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
