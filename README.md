# FlowSpace Backend

> AI-Augmented Team Productivity OS — REST API + WebSocket Server

[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?style=flat-square&logo=nestjs)](https://nestjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=flat-square&logo=prisma)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis)](https://redis.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)

---

## Overview

FlowSpace is a production-grade team productivity SaaS backend powering real-time Kanban boards, collaborative document editing, AI assistance, and event-driven notifications. Built with a modular NestJS architecture, Redis-backed WebSocket presence, and a fully decoupled event system.

**Live API:** `https://your-backend.railway.app/api/v1`
**Swagger Docs:** `https://your-backend.railway.app/api/docs`
**Frontend Repo:** [flowspace-frontend](#)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 10 + TypeScript |
| Database | PostgreSQL 16 via Prisma 7 + pg.Pool adapter |
| Cache / Presence | Redis 7 + ioredis |
| Real-time | Socket.io + NestJS WebSocket Gateway |
| Auth | JWT (access + refresh rotation) + Google OAuth 2.0 |
| AI | Groq Llama 3.1 / OpenAI GPT-4o-mini |
| Storage | Cloudinary (signed upload flow) |
| Docs | Swagger / OpenAPI |
| Deployment | Railway |

---

## Architecture
```
┌─────────────────────────────────────────────────────┐
│                   NestJS Application                │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │   Auth   │  │  Tasks   │  │  Notifications   │  │
│  │  Module  │  │  Module  │  │     Module       │  │
│  └──────────┘  └────┬─────┘  └────────┬─────────┘  │
│                     │ fires event      │ listens     │
│                     └──────────────────┘            │
│                    EventEmitter2                     │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │           WebSocket Gateway                  │   │
│  │     Redis presence tracking per socket       │   │
│  └──────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────┘
                        │
          ┌─────────────┴─────────────┐
          │                           │
    ┌─────▼──────┐           ┌────────▼───────┐
    │ PostgreSQL │           │     Redis      │
    │  Prisma 7  │           │  ioredis       │
    └────────────┘           └────────────────┘
```

---

## Modules

| Module | Responsibility |
|---|---|
| `AuthModule` | JWT auth, refresh token rotation, Google OAuth 2.0 |
| `UsersModule` | User profile management |
| `WorkspacesModule` | Multi-tenant workspaces, RBAC, invite system |
| `ProjectsModule` | Projects with auto-created Kanban boards |
| `TasksModule` | Tasks, comments, drag-and-drop ordering, domain events |
| `DocumentsModule` | Tiptap-compatible JSON document storage |
| `NotificationsModule` | Event-driven notifications → DB + WebSocket push |
| `ActivityModule` | Audit log, listens to task domain events |
| `GatewayModule` | WebSocket gateway, Redis presence, document rooms |
| `SearchModule` | Full-text search across tasks, docs, projects |
| `UploadsModule` | Cloudinary signed upload URL generation |
| `AiModule` | Summarize docs, generate subtasks, AI chat |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Docker + Docker Compose

### 1. Clone and install
```bash
git clone https://github.com/yourusername/flowspace-backend.git
cd flowspace-backend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```

Fill in your values:
```env
DATABASE_URL="postgresql://flowspace:flowspace@localhost:5432/flowspace"
REDIS_URL="redis://localhost:6379"

JWT_ACCESS_SECRET="your-access-secret-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-min-32-chars"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"

GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_CALLBACK_URL="http://localhost:3001/api/v1/auth/google/callback"

GROQ_API_KEY=""

CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

FRONTEND_URL="http://localhost:3000"
PORT=3001
NODE_ENV="development"
```

### 3. Start infrastructure
```bash
docker-compose up -d
```

Starts PostgreSQL on `5432` and Redis on `6379`.

### 4. Run migrations and seed
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

Seed creates two demo accounts:
| Email | Password | Role |
|---|---|---|
| alice@flowspace.dev | password123 | Owner |
| bob@flowspace.dev | password123 | Member |

### 5. Start development server
```bash
npm run start:dev
```

| URL | Description |
|---|---|
| `http://localhost:3001` | API landing page |
| `http://localhost:3001/api/v1` | API base URL |
| `http://localhost:3001/api/docs` | Swagger UI |
| `ws://localhost:3001/ws` | WebSocket endpoint |

---

## API Reference

### Auth
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/auth/register` | Register new user | Public |
| POST | `/auth/login` | Login with email + password | Public |
| POST | `/auth/refresh` | Rotate refresh token | Public |
| POST | `/auth/logout` | Logout current session | Bearer |
| GET | `/auth/google` | Initiate Google OAuth | Public |
| GET | `/auth/me` | Get current user | Bearer |

### Workspaces
| Method | Endpoint | Description |
|---|---|---|
| GET | `/workspaces` | Get all workspaces for current user |
| POST | `/workspaces` | Create workspace |
| GET | `/workspaces/:slug` | Get workspace with members + projects |
| PATCH | `/workspaces/:id` | Update workspace (admin+) |
| POST | `/workspaces/:id/members/invite` | Invite member |
| DELETE | `/workspaces/:id/members/:userId` | Remove member |

### Projects
| Method | Endpoint | Description |
|---|---|---|
| GET | `/projects/workspace/:workspaceId` | List projects in workspace |
| POST | `/projects` | Create project (auto-creates 4 boards) |
| GET | `/projects/:id` | Full board with all tasks |
| PATCH | `/projects/:id` | Update project |
| DELETE | `/projects/:id` | Soft delete project |

### Tasks
| Method | Endpoint | Description |
|---|---|---|
| POST | `/tasks` | Create task |
| GET | `/tasks/:id` | Get task with comments + activity |
| PATCH | `/tasks/:id` | Update task |
| PATCH | `/tasks/:id/move` | Move task between columns |
| DELETE | `/tasks/:id` | Soft delete task |
| POST | `/tasks/:id/comments` | Add comment |
| DELETE | `/tasks/:taskId/comments/:commentId` | Delete comment |

### AI
| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/ai/summarize` | `{ content }` | Summarize document text |
| POST | `/ai/generate-subtasks` | `{ taskTitle, taskDescription? }` | Generate subtasks |
| POST | `/ai/chat` | `{ message, context? }` | AI assistant chat |

### Other
| Method | Endpoint | Description |
|---|---|---|
| GET | `/search?q=&workspaceId=` | Global search |
| GET | `/notifications` | Paginated notifications |
| PATCH | `/notifications/:id/read` | Mark as read |
| PATCH | `/notifications/read-all` | Mark all as read |
| GET | `/activity/project/:projectId` | Project activity log |
| POST | `/uploads/presigned-url` | Get Cloudinary upload URL |

---

## WebSocket Events

Connect to `ws://localhost:3001/ws` with JWT in handshake:
```javascript
const socket = io('http://localhost:3001/ws', {
  auth: { token: accessToken }
});
```

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `join:workspace` | `workspaceId` | Join workspace room |
| `leave:workspace` | `workspaceId` | Leave workspace room |
| `join:document` | `documentId` | Join document collaboration room |
| `leave:document` | `documentId` | Leave document room |
| `document:update` | `{ documentId, content, version }` | Broadcast document changes |
| `cursor:update` | `{ documentId, position, color }` | Broadcast cursor position |
| `ping` | — | Heartbeat |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| `notification:new` | `Notification` | New notification pushed in real-time |
| `member:online` | `{ userId }` | Member came online in workspace |
| `member:offline` | `{ userId }` | Member went offline |
| `collaborator:joined` | `{ userId, socketId }` | Someone joined your document |
| `collaborator:left` | `{ userId }` | Someone left your document |
| `document:updated` | `{ content, version, userId }` | Document content changed |
| `cursor:updated` | `{ userId, position, color }` | Cursor position changed |

---

## Auth Flow
```
1. POST /auth/login → { accessToken (15m), refreshToken (7d) }
         ↓
2. Every request → Authorization: Bearer <accessToken>
         ↓
3. Token expires → POST /auth/refresh { refreshToken }
                → { new accessToken, new refreshToken }  ← old token invalidated
         ↓
4. WebSocket → io('/ws', { auth: { token: accessToken } })
```

Refresh tokens are stored in PostgreSQL `sessions` table. Each refresh rotates the token, preventing reuse attacks while supporting multi-device sessions.

---

## Database Schema

14 models across 5 domains:
```
Auth:         User, Session
Workspace:    Workspace, WorkspaceMember, WorkspaceInvite
Project:      Project, Board
Task:         Task, Label, Comment, Attachment
Document:     Document
Observability: Notification, ActivityLog
```

---

## Deployment

### Railway (recommended)

1. Push to GitHub
2. Connect repo to [Railway](https://railway.app)
3. Add PostgreSQL and Redis plugins
4. Set environment variables in Railway dashboard
5. Railway auto-deploys on every `git push`

### Docker
```bash
docker build -t flowspace-backend .
docker run -p 3001:3001 --env-file .env flowspace-backend
```

---

## Scripts
```bash
npm run start:dev      # Development with hot reload
npm run build          # Production build
npm run start          # Start production build
npm run prisma:migrate # Run database migrations
npm run prisma:seed    # Seed demo data
npm run prisma:studio  # Open Prisma Studio
```