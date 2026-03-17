# FlowSpace — Full Technical Blueprint

---

## 1. DATABASE SCHEMA (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────
// AUTH & USERS
// ─────────────────────────────────────────

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  avatarUrl     String?
  passwordHash  String?   // null if OAuth only
  provider      String?   // "google" | "github" | null
  providerId    String?
  isVerified    Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime? // soft delete

  // Relations
  memberships   WorkspaceMember[]
  assignedTasks Task[]            @relation("TaskAssignee")
  createdTasks  Task[]            @relation("TaskCreator")
  comments      Comment[]
  notifications Notification[]
  documents     Document[]
  activities    ActivityLog[]
  sessions      Session[]
}

model Session {
  id           String   @id @default(cuid())
  userId       String
  refreshToken String   @unique
  userAgent    String?
  ipAddress    String?
  expiresAt    DateTime
  createdAt    DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ─────────────────────────────────────────
// WORKSPACE (Multi-tenant root)
// ─────────────────────────────────────────

model Workspace {
  id          String    @id @default(cuid())
  name        String
  slug        String    @unique  // used in URLs: flowspace.app/ws/acme-corp
  logoUrl     String?
  plan        Plan      @default(FREE)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  members     WorkspaceMember[]
  projects    Project[]
  invites     WorkspaceInvite[]
}

enum Plan {
  FREE
  PRO
  ENTERPRISE
}

model WorkspaceMember {
  id          String          @id @default(cuid())
  workspaceId String
  userId      String
  role        WorkspaceRole   @default(MEMBER)
  joinedAt    DateTime        @default(now())

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, userId])
}

enum WorkspaceRole {
  OWNER
  ADMIN
  MEMBER
  GUEST
}

model WorkspaceInvite {
  id          String    @id @default(cuid())
  workspaceId String
  email       String
  role        WorkspaceRole @default(MEMBER)
  token       String    @unique @default(cuid())
  expiresAt   DateTime
  acceptedAt  DateTime?
  createdAt   DateTime  @default(now())

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([token])
}

// ─────────────────────────────────────────
// PROJECTS & TASKS
// ─────────────────────────────────────────

model Project {
  id          String        @id @default(cuid())
  workspaceId String
  name        String
  description String?
  icon        String?       // emoji or icon name
  color       String?       // hex color for UI
  status      ProjectStatus @default(ACTIVE)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  deletedAt   DateTime?

  workspace   Workspace  @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  boards      Board[]
  documents   Document[]
  activities  ActivityLog[]

  @@index([workspaceId])
}

enum ProjectStatus {
  ACTIVE
  ARCHIVED
  COMPLETED
}

model Board {
  id        String  @id @default(cuid())
  projectId String
  name      String  // e.g. "Backlog", "In Progress", "Done"
  order     Int     // for drag-and-drop column ordering
  color     String?

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  tasks   Task[]

  @@index([projectId])
}

model Task {
  id          String       @id @default(cuid())
  boardId     String
  creatorId   String
  assigneeId  String?
  title       String
  description String?      // rich text / markdown
  priority    Priority     @default(MEDIUM)
  status      TaskStatus   @default(TODO)
  order       Float        // fractional indexing for drag-and-drop
  dueDate     DateTime?
  labels      Label[]
  attachments Attachment[]
  comments    Comment[]
  activities  ActivityLog[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  deletedAt   DateTime?

  board    Board  @relation(fields: [boardId], references: [id], onDelete: Cascade)
  creator  User   @relation("TaskCreator", fields: [creatorId], references: [id])
  assignee User?  @relation("TaskAssignee", fields: [assigneeId], references: [id])

  @@index([boardId])
  @@index([assigneeId])
}

enum Priority {
  URGENT
  HIGH
  MEDIUM
  LOW
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  IN_REVIEW
  DONE
  CANCELLED
}

model Label {
  id    String @id @default(cuid())
  name  String
  color String
  tasks Task[]
}

model Comment {
  id        String    @id @default(cuid())
  taskId    String
  authorId  String
  content   String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  task   Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  author User @relation(fields: [authorId], references: [id])

  @@index([taskId])
}

model Attachment {
  id        String   @id @default(cuid())
  taskId    String
  name      String
  url       String   // S3/R2 URL
  mimeType  String
  size      Int      // bytes
  createdAt DateTime @default(now())

  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
}

// ─────────────────────────────────────────
// DOCUMENTS (Collaborative editor)
// ─────────────────────────────────────────

model Document {
  id          String    @id @default(cuid())
  projectId   String
  authorId    String
  title       String    @default("Untitled")
  content     Json?     // Tiptap JSON format
  isPublic    Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  project  Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  author   User    @relation(fields: [authorId], references: [id])

  @@index([projectId])
}

// ─────────────────────────────────────────
// NOTIFICATIONS & ACTIVITY
// ─────────────────────────────────────────

model Notification {
  id         String           @id @default(cuid())
  userId     String
  type       NotificationType
  title      String
  body       String?
  resourceId String?          // taskId, documentId, etc.
  isRead     Boolean          @default(false)
  createdAt  DateTime         @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
}

enum NotificationType {
  TASK_ASSIGNED
  TASK_COMMENTED
  TASK_STATUS_CHANGED
  DOCUMENT_SHARED
  WORKSPACE_INVITE
  MENTION
}

model ActivityLog {
  id          String   @id @default(cuid())
  userId      String
  projectId   String?
  taskId      String?
  action      String   // "task.created", "task.moved", "comment.added"
  metadata    Json?    // { from: "Todo", to: "In Progress" }
  createdAt   DateTime @default(now())

  user    User     @relation(fields: [userId], references: [id])
  project Project? @relation(fields: [projectId], references: [id])
  task    Task?    @relation(fields: [taskId], references: [id])

  @@index([projectId])
  @@index([taskId])
}
```

---

## 2. NESTJS BACKEND STRUCTURE

```
backend/
├── src/
│   ├── main.ts                          # Bootstrap, global pipes, CORS, Swagger
│   ├── app.module.ts                    # Root module
│   │
│   ├── config/
│   │   ├── configuration.ts             # typed config using @nestjs/config
│   │   └── validation.ts               # Joi/Zod env validation schema
│   │
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── workspace-member.decorator.ts
│   │   │   └── public.decorator.ts      # skip JWT guard
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── workspace-role.guard.ts  # checks WorkspaceMember role
│   │   ├── interceptors/
│   │   │   ├── transform.interceptor.ts # wraps all responses: { data, meta }
│   │   │   └── logging.interceptor.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts # standardized error shape
│   │   ├── pipes/
│   │   │   └── zod-validation.pipe.ts
│   │   └── types/
│   │       └── express.d.ts             # extends Request with `user`
│   │
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts            # extends PrismaClient, handles onModuleInit
│   │
│   ├── redis/
│   │   ├── redis.module.ts
│   │   └── redis.service.ts             # ioredis wrapper with typed helpers
│   │
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts           # POST /auth/register, /login, /refresh, /logout
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   ├── jwt-refresh.strategy.ts
│   │   │   └── google.strategy.ts
│   │   └── dto/
│   │       ├── register.dto.ts
│   │       └── login.dto.ts
│   │
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts          # GET /users/me, PATCH /users/me
│   │   ├── users.service.ts
│   │   └── dto/
│   │       └── update-user.dto.ts
│   │
│   ├── workspaces/
│   │   ├── workspaces.module.ts
│   │   ├── workspaces.controller.ts     # CRUD + invite endpoints
│   │   ├── workspaces.service.ts
│   │   └── dto/
│   │       ├── create-workspace.dto.ts
│   │       └── invite-member.dto.ts
│   │
│   ├── projects/
│   │   ├── projects.module.ts
│   │   ├── projects.controller.ts
│   │   ├── projects.service.ts
│   │   └── dto/
│   │
│   ├── boards/
│   │   ├── boards.module.ts
│   │   ├── boards.controller.ts
│   │   ├── boards.service.ts
│   │   └── dto/
│   │
│   ├── tasks/
│   │   ├── tasks.module.ts
│   │   ├── tasks.controller.ts          # CRUD + move (board change)
│   │   ├── tasks.service.ts
│   │   ├── tasks.events.ts              # EventEmitter event classes
│   │   └── dto/
│   │       ├── create-task.dto.ts
│   │       ├── update-task.dto.ts
│   │       └── move-task.dto.ts
│   │
│   ├── comments/
│   │   ├── comments.module.ts
│   │   ├── comments.controller.ts
│   │   └── comments.service.ts
│   │
│   ├── documents/
│   │   ├── documents.module.ts
│   │   ├── documents.controller.ts
│   │   ├── documents.service.ts
│   │   └── dto/
│   │
│   ├── notifications/
│   │   ├── notifications.module.ts
│   │   ├── notifications.controller.ts  # GET /notifications, PATCH /notifications/read-all
│   │   ├── notifications.service.ts     # listens to events, creates DB records + pushes via WS
│   │   └── dto/
│   │
│   ├── activity/
│   │   ├── activity.module.ts
│   │   └── activity.service.ts          # write-only service, called by others
│   │
│   ├── search/
│   │   ├── search.module.ts
│   │   └── search.controller.ts         # GET /search?q=&workspaceId=
│   │
│   ├── uploads/
│   │   ├── uploads.module.ts
│   │   └── uploads.controller.ts        # POST /uploads → returns S3/R2 presigned URL
│   │
│   ├── ai/
│   │   ├── ai.module.ts
│   │   ├── ai.controller.ts             # POST /ai/summarize, /ai/generate-subtasks
│   │   └── ai.service.ts                # OpenAI SDK wrapper
│   │
│   └── gateway/
│       ├── app.gateway.ts               # Main WebSocket gateway
│       ├── gateway.module.ts
│       └── gateway.service.ts           # Redis-backed presence tracking
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
│
├── test/
│   ├── auth.e2e-spec.ts
│   └── tasks.e2e-spec.ts
│
├── .env.example
├── docker-compose.yml                   # postgres + redis for local dev
├── Dockerfile
└── package.json
```

### Key Implementation Patterns

**WebSocket Gateway (`app.gateway.ts`)**
```typescript
@WebSocketGateway({ cors: true, namespace: '/ws' })
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {

  constructor(private readonly redisService: RedisService) {}

  // On connect: store socketId → userId mapping in Redis
  async handleConnection(client: Socket) {
    const userId = await this.authenticate(client);
    await this.redisService.set(`socket:${client.id}`, userId, 86400);
    await this.redisService.sadd(`user:${userId}:sockets`, client.id);
  }

  // On disconnect: clean up Redis
  async handleDisconnect(client: Socket) {
    const userId = await this.redisService.get(`socket:${client.id}`);
    await this.redisService.del(`socket:${client.id}`);
    await this.redisService.srem(`user:${userId}:sockets`, client.id);
  }

  // Emit to specific user (all their tabs/devices)
  async emitToUser(userId: string, event: string, data: any) {
    const socketIds = await this.redisService.smembers(`user:${userId}:sockets`);
    socketIds.forEach(id => this.server.to(id).emit(event, data));
  }

  // Emit to all members of a workspace
  async emitToWorkspace(workspaceId: string, event: string, data: any) {
    this.server.to(`workspace:${workspaceId}`).emit(event, data);
  }

  @SubscribeMessage('join:workspace')
  async handleJoinWorkspace(client: Socket, workspaceId: string) {
    client.join(`workspace:${workspaceId}`);
  }
}
```

**Event-Driven Notifications**
```typescript
// tasks.service.ts — fires event, doesn't care about notification logic
async moveTask(taskId: string, dto: MoveTaskDto, userId: string) {
  const task = await this.prisma.task.update({ ... });
  this.eventEmitter.emit('task.moved', new TaskMovedEvent(task, userId));
  return task;
}

// notifications.service.ts — listens and handles side effects
@OnEvent('task.moved')
async handleTaskMoved(event: TaskMovedEvent) {
  if (event.task.assigneeId && event.task.assigneeId !== event.userId) {
    await this.createNotification({
      userId: event.task.assigneeId,
      type: 'TASK_STATUS_CHANGED',
      title: `Task moved to ${event.task.board.name}`,
      resourceId: event.task.id,
    });
  }
}
```

---

## 3. NEXTJS FRONTEND STRUCTURE

```
frontend/
├── src/
│   ├── app/                              # Next.js 14 App Router
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx               # centered auth layout
│   │   │
│   │   ├── (app)/                       # Protected routes
│   │   │   ├── layout.tsx               # Sidebar + TopBar + WS Provider
│   │   │   ├── ws-provider.tsx          # socket.io-client, dispatches to Redux
│   │   │   │
│   │   │   ├── workspace/
│   │   │   │   └── [slug]/
│   │   │   │       ├── page.tsx         # Workspace home / activity feed
│   │   │   │       ├── settings/
│   │   │   │       │   └── page.tsx     # Members, billing, danger zone
│   │   │   │       └── project/
│   │   │   │           └── [projectId]/
│   │   │   │               ├── layout.tsx   # Project sub-nav (Board, Docs, Activity)
│   │   │   │               ├── board/
│   │   │   │               │   └── page.tsx # Kanban board
│   │   │   │               ├── docs/
│   │   │   │               │   ├── page.tsx         # Docs list
│   │   │   │               │   └── [docId]/
│   │   │   │               │       └── page.tsx     # Tiptap editor
│   │   │   │               └── activity/
│   │   │   │                   └── page.tsx
│   │   │   │
│   │   │   └── notifications/
│   │   │       └── page.tsx
│   │   │
│   │   ├── api/                         # Next.js route handlers (thin proxies if needed)
│   │   │   └── auth/[...nextauth]/
│   │   │       └── route.ts
│   │   │
│   │   ├── layout.tsx                   # Root layout, fonts, ThemeProvider
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ui/                          # Shadcn components (auto-generated)
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx              # Workspace nav, project list, collapse animation
│   │   │   ├── TopBar.tsx               # Breadcrumb, search trigger, notifications bell
│   │   │   └── CommandPalette.tsx       # cmdk-powered global search (Cmd+K)
│   │   │
│   │   ├── board/
│   │   │   ├── KanbanBoard.tsx          # @dnd-kit/core drag context
│   │   │   ├── BoardColumn.tsx          # Droppable column
│   │   │   ├── TaskCard.tsx             # Draggable card with Framer Motion layout
│   │   │   └── TaskDetailModal.tsx      # Full task view in a sheet/dialog
│   │   │
│   │   ├── editor/
│   │   │   ├── RichTextEditor.tsx       # Tiptap + extensions
│   │   │   ├── EditorToolbar.tsx
│   │   │   └── CollaboratorCursors.tsx  # Show presence avatars
│   │   │
│   │   ├── notifications/
│   │   │   ├── NotificationBell.tsx
│   │   │   └── NotificationPanel.tsx    # Framer Motion slide-in panel
│   │   │
│   │   ├── ai/
│   │   │   └── AiAssistantPanel.tsx     # Slide-in AI sidebar
│   │   │
│   │   └── common/
│   │       ├── Avatar.tsx
│   │       ├── UserPresence.tsx         # Green dot for online users
│   │       ├── PriorityBadge.tsx
│   │       └── EmptyState.tsx
│   │
│   ├── store/                           # Redux Toolkit
│   │   ├── index.ts                     # configureStore
│   │   ├── hooks.ts                     # typed useAppDispatch, useAppSelector
│   │   │
│   │   ├── slices/
│   │   │   ├── auth.slice.ts            # current user, tokens
│   │   │   ├── workspace.slice.ts       # active workspace
│   │   │   ├── ui.slice.ts              # sidebar open, active modal, command palette
│   │   │   └── presence.slice.ts        # who is online in current workspace
│   │   │
│   │   └── api/                         # RTK Query
│   │       ├── baseApi.ts               # createApi with baseUrl + auth header injection
│   │       ├── authApi.ts
│   │       ├── workspacesApi.ts
│   │       ├── projectsApi.ts
│   │       ├── tasksApi.ts              # includes optimistic updates on moveTask
│   │       ├── documentsApi.ts
│   │       └── notificationsApi.ts
│   │
│   ├── hooks/
│   │   ├── useWebSocket.ts              # connects socket, handles reconnection
│   │   ├── useOptimisticTask.ts         # wraps RTK Query mutation with optimistic update
│   │   ├── useCommandPalette.ts         # Cmd+K global shortcut
│   │   └── useDebounce.ts
│   │
│   ├── lib/
│   │   ├── api-client.ts                # axios instance (SSR-safe)
│   │   ├── socket.ts                    # singleton socket.io client
│   │   ├── fractional-index.ts          # generates order values for drag-and-drop
│   │   └── utils.ts                     # cn(), formatDate(), truncate()
│   │
│   ├── middleware.ts                     # Next.js middleware: redirect unauthenticated users
│   └── types/
│       ├── api.types.ts                 # mirrors Prisma models (or use shared package)
│       └── socket.types.ts              # typed socket event payloads
│
├── public/
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

### Key Frontend Patterns

**Optimistic Task Move (RTK Query)**
```typescript
// store/api/tasksApi.ts
moveTask: builder.mutation({
  queryFn: async (args, _api, _extraOptions, baseQuery) => {
    return baseQuery({ url: `/tasks/${args.taskId}/move`, method: 'PATCH', body: args });
  },
  onQueryStarted: async (args, { dispatch, queryFulfilled }) => {
    // 1. Immediately update the cache (optimistic)
    const patch = dispatch(
      tasksApi.util.updateQueryData('getBoard', args.boardId, (draft) => {
        // move task from old column to new column in draft
      })
    );
    try {
      await queryFulfilled; // 2. Wait for server confirmation
    } catch {
      patch.undo(); // 3. Revert if server rejects
    }
  },
}),
```

**WebSocket → Redux Bridge**
```typescript
// app/(app)/ws-provider.tsx
useEffect(() => {
  socket.on('task:moved', (payload) => {
    dispatch(tasksApi.util.updateQueryData('getBoard', payload.boardId, (draft) => {
      // update draft with server-confirmed state
    }));
  });

  socket.on('notification:new', (notification) => {
    dispatch(notificationsApi.util.updateQueryData('getNotifications', undefined, (draft) => {
      draft.unshift(notification);
    }));
  });

  return () => { socket.off('task:moved'); socket.off('notification:new'); };
}, [dispatch]);
```

**Framer Motion Task Card**
```typescript
// components/board/KanbanBoard.tsx
<AnimatePresence>
  {tasks.map(task => (
    <motion.div
      key={task.id}
      layout                              // animates position changes automatically
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
    >
      <TaskCard task={task} />
    </motion.div>
  ))}
</AnimatePresence>
```

---

## 4. ENVIRONMENT VARIABLES

```bash
# backend/.env.example
DATABASE_URL="postgresql://user:password@localhost:5432/flowspace"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_SECRET="your-access-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_CALLBACK_URL="http://localhost:3001/auth/google/callback"
CLOUDFLARE_R2_ACCESS_KEY=""
CLOUDFLARE_R2_SECRET_KEY=""
CLOUDFLARE_R2_BUCKET=""
CLOUDFLARE_R2_ENDPOINT=""
OPENAI_API_KEY=""
PORT=3001

# frontend/.env.local
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_WS_URL="http://localhost:3001"
```

---

## 5. DOCKER COMPOSE (Local Dev)

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: flowspace
      POSTGRES_PASSWORD: flowspace
      POSTGRES_DB: flowspace
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## 6. RECOMMENDED PACKAGES

### Backend
```json
{
  "@nestjs/jwt": "JWT auth",
  "@nestjs/passport": "strategy system",
  "@nestjs/event-emitter": "decoupled events",
  "@nestjs/websockets": "WebSocket gateway",
  "passport-google-oauth20": "Google OAuth",
  "socket.io": "WebSocket server",
  "ioredis": "Redis client",
  "bcrypt": "password hashing",
  "zod": "runtime validation",
  "@aws-sdk/client-s3": "R2 / S3 uploads",
  "openai": "AI features",
  "@nestjs/swagger": "API docs"
}
```

### Frontend
```json
{
  "@reduxjs/toolkit": "state management",
  "react-redux": "React bindings",
  "socket.io-client": "WebSocket client",
  "@dnd-kit/core": "drag and drop",
  "@dnd-kit/sortable": "sortable lists",
  "framer-motion": "animations",
  "@tiptap/react": "rich text editor",
  "@tiptap/starter-kit": "editor extensions",
  "cmdk": "command palette",
  "axios": "HTTP client",
  "date-fns": "date formatting",
  "zod": "form validation",
  "react-hook-form": "form state"
}
```

---

## 7. BUILD ORDER (Month-by-Month)

### Month 1
1. Set up monorepo, Docker Compose, CI pipeline
2. Prisma schema + migrations + seed data
3. Auth module (register, login, refresh, Google OAuth)
4. Workspace + Project + Board + Task CRUD
5. Basic Kanban UI with drag-and-drop (no real-time yet)
6. RTK Query wired to all endpoints

### Month 2
7. WebSocket gateway + Redis presence tracking
8. Real-time task updates broadcast to workspace room
9. Optimistic UI updates on task move
10. Tiptap document editor (no collaboration yet)
11. Notification system (events → DB → WS push)
12. Full-text search endpoint + Command Palette UI

### Month 3
13. Collaborator cursor presence on documents
14. AI sidebar (summarize doc, generate subtasks)
15. Analytics dashboard (Recharts)
16. File uploads (R2 presigned URLs)
17. Deploy: Railway (backend) + Vercel (frontend)
18. Polish: loading skeletons, empty states, mobile responsiveness
19. README with architecture diagram + Loom demo video
```
