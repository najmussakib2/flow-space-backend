/* eslint-disable prettier/prettier */
import { PrismaClient } from '../generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import { WorkspaceRole, Priority, TaskStatus } from '../generated/prisma/client';
import * as bcrypt from 'bcrypt';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

console.log({connectionString});

if (!connectionString) {
  throw new Error('DATABASE_URL not set!');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding...');
  const hash = await bcrypt.hash('password123', 12);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@flowspace.dev' },
    update: {},
    create: { email: 'alice@flowspace.dev', name: 'Alice Johnson', passwordHash: hash, isVerified: true },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@flowspace.dev' },
    update: {},
    create: { email: 'bob@flowspace.dev', name: 'Bob Smith', passwordHash: hash, isVerified: true },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: { name: 'Acme Corp', slug: 'acme-corp', plan: 'PRO' },
  });

  for (const [userId, role] of [[alice.id, WorkspaceRole.OWNER], [bob.id, WorkspaceRole.MEMBER]] as const) {
    await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId } },
      update: {},
      create: { workspaceId: workspace.id, userId, role },
    });
  }

  const project = await prisma.project.create({
    data: { workspaceId: workspace.id, name: 'Website Redesign', icon: '🌐', color: '#6366F1' },
  });

  const boards = await Promise.all([
    prisma.board.create({ data: { projectId: project.id, name: 'Backlog', order: 0 } }),
    prisma.board.create({ data: { projectId: project.id, name: 'In Progress', order: 1 } }),
    prisma.board.create({ data: { projectId: project.id, name: 'In Review', order: 2 } }),
    prisma.board.create({ data: { projectId: project.id, name: 'Done', order: 3 } }),
  ]);

  await prisma.task.createMany({
    data: [
      { boardId: boards[0].id, creatorId: alice.id, assigneeId: alice.id, title: 'Research competitor websites', priority: Priority.HIGH, status: TaskStatus.TODO, order: 1000 },
      { boardId: boards[1].id, creatorId: alice.id, assigneeId: bob.id, title: 'Design homepage wireframes', priority: Priority.URGENT, status: TaskStatus.IN_PROGRESS, order: 1000 },
      { boardId: boards[2].id, creatorId: bob.id, assigneeId: alice.id, title: 'Mobile responsiveness', priority: Priority.MEDIUM, status: TaskStatus.IN_REVIEW, order: 1000 },
      { boardId: boards[3].id, creatorId: alice.id, assigneeId: alice.id, title: 'Domain configuration', priority: Priority.LOW, status: TaskStatus.DONE, order: 1000 },
    ],
  });

  console.log('✅ Done!');
  console.log('   alice@flowspace.dev / password123 (Owner)');
  console.log('   bob@flowspace.dev / password123 (Member)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());