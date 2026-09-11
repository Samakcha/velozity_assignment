# Velozity Project Hub — Real-Time Client & Project Management Platform

Velozity Project Hub is a full-stack, enterprise-grade project management web application built for real-time team collaboration, client tracking, and developer task assignment. Featuring strict role-based access control (RBAC), live Socket.io updates, persistent notifications, automated overdue task management, and responsive dashboards, Velozity provides a complete operational workspace for Admins, Project Managers, and Developers.

---

## 1. Project Overview

Velozity Project Hub streamlines multi-project workflows across agency and engineering teams:
- **Project Managers** select clients, launch projects, break down deliverables into tasks, assign tasks to developers, track real-time activity feeds, and receive instant status updates.
- **Developers** access a focused dashboard containing only their assigned tasks, transition task statuses live, and receive real-time assignment notifications.
- **System Admins** maintain full platform oversight across clients, projects, tasks, activity, and platform health.

---

## 2. Features

- **Dual-Token JWT Authentication**: Short-lived access tokens stored in-memory with automatic silent refresh via 7-day HttpOnly cookies.
- **Role-Based Access Control (RBAC)**: Strict server-side authorization enforcing `ADMIN`, `PROJECT_MANAGER`, and `DEVELOPER` roles.
- **Client & Project Management**: Client tracking and project creation with PM ownership and client association.
- **Task Assignment & Workflow**: Task creation, priority setting (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), status tracking (`TO_DO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `OVERDUE`), due date management, and developer assignment.
- **Task Filtering**: Dynamic client- and server-side filtering by status, priority, due date, and combined constraints.
- **Real-Time WebSockets (Socket.io)**: Instant activity stream updates, live task status syncing for PMs, and real-time task assignment notifications.
- **Persistent Notifications**: User notifications are persisted in PostgreSQL to support offline recovery and real-time delivery with live unread badge counters.
- **Automated Overdue Task Job**: Background `node-cron` scheduled task that automatically identifies eligible overdue tasks, transitions status to `OVERDUE`, creates system activity logs, and preserves idempotency and concurrency protection.
- **Role-Specific Dashboards**: Custom metrics, summary cards, activity feeds, and task lists tailored specifically for Admins, PMs, and Developers.

---

## 3. Tech Stack

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite 6
- **Styling**: Vanilla CSS (Custom Tokens, Dark Mode, Modern Component Styles)
- **Icons**: React Icons (`react-icons/fi`)
- **Routing**: React Router DOM 7
- **Real-Time Client**: Socket.io Client 4

### Backend
- **Runtime**: Node.js
- **Framework**: Express 4
- **Language**: TypeScript (`tsx` execution engine)
- **Real-Time Server**: Socket.io 4
- **Security**: Helmet 8, Express Rate Limit 8, CORS
- **Validation**: Zod 4
- **Background Tasks**: Node-Cron 4

### Database & ORM
- **Database**: PostgreSQL (Neon Database compatibility)
- **ORM**: Prisma 6

### Authentication
- **JSON Web Tokens**: `jsonwebtoken` (Access Token + Refresh Token architecture)
- **Password Hashing**: `bcryptjs`
- **Cookies**: `cookie-parser` (HttpOnly, SameSite cookie handling)

---

## 4. Project Structure

```
velozity_assignment/
├── client/                     # React 18 + Vite Frontend Application
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── auth/               # AuthContext & AuthProvider (In-memory token management)
│   │   ├── components/         # Modular UI Components
│   │   │   ├── dashboard/      # ActivityFeed, StatCard
│   │   │   ├── layout/         # Navbar, Sidebar, ProtectedRoute
│   │   │   ├── projects/       # ProjectForm, ProjectList
│   │   │   ├── tasks/          # TaskList, TaskFilters, TaskForm, TaskStatusControl
│   │   │   └── NotificationBell.tsx
│   │   ├── pages/              # AdminDashboard, PMDashboard, DeveloperDashboard, Projects, Tasks, ProjectDetails, Login
│   │   ├── services/           # API Client (Axios-free fetch wrapper with silent token refresh)
│   │   ├── socket/             # Socket.io connection manager & custom hooks
│   │   ├── App.tsx             # Main Application routes & layout
│   │   └── main.tsx            # Application entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── server/                     # Express + TypeScript Backend API
│   ├── src/
│   │   ├── config/             # Environment variables & database client
│   │   ├── controllers/        # Request handlers (auth, client, project, task, notification)
│   │   ├── jobs/               # Scheduled background jobs (overdue task checker)
│   │   ├── middleware/         # Auth, RBAC, error handling, rate limiting
│   │   ├── routes/             # Express API route modules
│   │   ├── services/           # Business logic & database operations
│   │   ├── socket/             # Socket.io authentication & room handler
│   │   ├── utils/              # API response formatting, password hashing, token utilities, Zod schemas
│   │   └── server.ts           # Server bootstrap & HTTP / Socket server initialization
│   ├── package.json
│   └── tsconfig.json
├── prisma/
│   ├── schema.prisma           # Complete database model definitions & indexes
│   └── seed.ts                 # Database seed script with demo datasets
├── .env.example                # Template for environment variables
├── package.json                # Root workspace commands
└── README.md                   # Platform documentation
```

---

## 5. Architecture

Velozity Project Hub utilizes a decoupled client-server architecture with persistent WebSocket channels:

```
+-----------------------------------------------------------------------+
|                           REACT FRONTEND                              |
|   +-------------------+  +-------------------+  +------------------+  |
|   | AuthContext (RAM) |  |   API Service     |  | Socket.io Client |  |
|   +---------+---------+  +---------+---------+  +--------+---------+  |
+-------------|----------------------|-----------------------|----------+
              | (Bearer Token)       | (REST HTTP API)       | (WSS / WebSockets)
              v                      v                       v
+-----------------------------------------------------------------------+
|                           EXPRESS BACKEND                             |
|   +-------------------+  +-------------------+  +------------------+  |
|   | Auth / RBAC MW    |  | REST Controllers  |  | Socket Manager   |  |
|   +---------+---------+  +---------+---------+  +--------+---------+  |
|             |                      |                       |          |
|             +----------------------+-----------------------+          |
|                                    |                                  |
|                          +---------v---------+                        |
|                          | Prisma ORM Service|                        |
|                          +---------+---------+                        |
+------------------------------------|----------------------------------+
                                     v
+-----------------------------------------------------------------------+
|                          POSTGRESQL DATABASE                          |
|   (Users, Clients, Projects, Tasks, ActivityLogs, Notifications)      |
+-----------------------------------------------------------------------+
```

1. **Authentication Layer**: The client authenticates via `/api/auth/login`. Access tokens are returned in JSON and held in React memory (`AuthContext`). Refresh tokens are placed into a secure HttpOnly cookie.
2. **REST API & Middleware**: Incoming HTTP requests pass through security headers (`helmet`), rate limiting, JWT verification, and server-side RBAC middleware before reaching controllers.
3. **Database Layer**: Controllers invoke Prisma ORM services to execute parameterised queries against PostgreSQL.
4. **Real-Time Communication**: Socket.io authenticates connections via handshake JWT. When task actions or assignments occur, real-time events are emitted directly to specific user rooms (`user:<userId>`) and project rooms (`project:<projectId>`).

---

## 6. Role-Based Access Control (RBAC)

All access restrictions are enforced **strictly on the backend server**. Frontend UI element toggling is purely presentational.

| Role | Client Access | Project Access | Task Access | Room / Socket Access |
|------|---------------|----------------|-------------|----------------------|
| **ADMIN** | Full CRUD | Full CRUD across all projects | Full CRUD across all tasks | Joins any room, global activity stream |
| **PROJECT_MANAGER** | Read Only (for project creation) | Full CRUD on projects created by self | Create, update, assign tasks in owned projects | Joins owned project rooms, real-time updates |
| **DEVELOPER** | Blocked | Read Only (assigned tasks' projects) | Update status/notes for assigned tasks only | Joins `user:<userId>` room only (blocked from project rooms) |

---

## 7. Database Schema

The database schema (`prisma/schema.prisma`) defines 7 core models and relational indexes optimized for high-volume filtering.

### Models & Key Relations
- **`User`**: System accounts (`ADMIN`, `PROJECT_MANAGER`, `DEVELOPER`).
- **`Client`**: Organization/Client profiles associated with projects.
- **`Project`**: Projects owned by a PM (`createdById`) and linked to a `Client`.
- **`Task`**: Tasks associated with a `Project` and optionally assigned to a `User` (`assignedToId`).
- **`ActivityLog`**: Historical audit trail for project and task actions.
- **`Notification`**: Persistent notifications tied to a specific `User`.
- **`RefreshToken`**: Cryptographic refresh token hashes for session security.

### Database Indexes
- `User`: `@@index([role])`
- `Client`: `@@index([name])`, `@@index([createdAt])`
- `Project`: `@@index([clientId])`, `@@index([createdById])`, `@@index([createdAt])`
- `Task`: `@@index([projectId])`, `@@index([assignedToId])`, `@@index([status])`, `@@index([priority])`, `@@index([dueDate])`, `@@index([projectId, status])`, `@@index([assignedToId, status])`
- `ActivityLog`: `@@index([projectId])`, `@@index([taskId])`, `@@index([userId])`, `@@index([createdAt])`, `@@index([projectId, createdAt(sort: Desc)])`
- `Notification`: `@@index([userId])`, `@@index([isRead])`, `@@index([taskId])`, `@@index([userId, isRead, createdAt(sort: Desc)])`
- `RefreshToken`: `@@index([userId])`, `@@index([expiresAt])`

---

## 8. Authentication

- **Access Token**: Short-lived JWT (default: `1h`), stored in-memory inside React state. Tokens are never written to `localStorage` or `sessionStorage`.
- **Refresh Token**: Long-lived JWT (default: `7d`), stored in an `HttpOnly`, `SameSite=Lax` cookie.
- **Token Hashing & Rotation**: Refresh tokens are SHA-256 hashed before storage in PostgreSQL (`RefreshToken` table). Revoked tokens are tracked upon logout or re-issuance.
- **Session Restoration**: On browser refresh, the client issues a silent POST `/api/auth/refresh` using the HttpOnly cookie to obtain a fresh access token without user interruption.

---

## 9. Real-Time Architecture

Real-time capabilities are built entirely on **Socket.io / WebSockets** (no polling or Server-Sent Events).

- **Handshake Authentication**: Socket connections authenticate using the JWT access token passed in `handshake.auth.token`.
- **User Rooms**: Every authenticated user automatically joins `user:<userId>`. Direct notifications (`notification:new`, `notification:unread_count`) are dispatched to this room.
- **Project Rooms**: Users with authorization (Admins & Project Managers) can join `project:<projectId>`. Real-time activity updates (`activity:new`, `task:updated`) stream to project rooms.
- **Developer Room Isolation**: Developer roles are denied access to project rooms server-side to enforce strict task boundary isolation.
- **Missed Activity Recovery**: Upon viewing a project activity feed or reconnecting, clients fetch historical activity log events from PostgreSQL, subject to the user's role and authorization visibility.

---

## 10. Background Job

An automated background job is configured using `node-cron` in `server/src/jobs/overdueJob.ts`:

- **Schedule**: Runs every 15 minutes (`*/15 * * * *`).
- **Logic**: Queries tasks where `dueDate < NOW()` and `status` is not `DONE` or `OVERDUE`.
- **Transition**: Updates task status to `OVERDUE`.
- **Idempotency & Concurrency**: Wraps updates in Prisma transactions, creates `SYSTEM` activity logs, and preserves idempotency and concurrency protection without duplicate state mutations.

---

## 11. Notifications

- **Triggers**: Task assignment (`TASK_ASSIGNED`), task status changes to in-review (`TASK_IN_REVIEW`), and project updates (`PROJECT_UPDATED`).
- **Persistence**: User notifications are persisted in PostgreSQL to support offline recovery and real-time delivery with `isRead=false`.
- **Real-Time Push**: Emitted immediately via Socket.io to the targeted user's room (`user:<userId>`).
- **Badge Synchronization**: Updates the unread count badge live across all active user sessions without requiring a browser refresh.

---

## 12. API Routes

### Authentication (`/api/auth`)
| Method | Endpoint | Purpose | Access |
|--------|----------|---------|--------|
| `POST` | `/api/auth/login` | Authenticate user credentials & issue tokens | Public |
| `POST` | `/api/auth/refresh` | Issue new access token using HttpOnly cookie | Public (Cookie required) |
| `POST` | `/api/auth/logout` | Revoke refresh token & clear cookie | Authenticated |
| `GET`  | `/api/auth/me` | Fetch current authenticated profile | Authenticated |

### Clients (`/api/clients`)
| Method | Endpoint | Purpose | Access |
|--------|----------|---------|--------|
| `GET`  | `/api/clients` | List all clients | Admin, Project Manager |
| `POST` | `/api/clients` | Create new client | Admin |
| `GET`  | `/api/clients/:id` | Get client details | Admin, Project Manager |
| `PUT`  | `/api/clients/:id` | Update client | Admin |
| `DELETE`|`/api/clients/:id` | Delete client | Admin |

### Projects (`/api/projects`)
| Method | Endpoint | Purpose | Access |
|--------|----------|---------|--------|
| `GET`  | `/api/projects` | List projects (Filtered by role) | Authenticated |
| `POST` | `/api/projects` | Create project | Admin, Project Manager |
| `GET`  | `/api/projects/:id` | Get project details & tasks | Authenticated |
| `PUT`  | `/api/projects/:id` | Update project | Admin, PM (Owner) |
| `DELETE`|`/api/projects/:id` | Delete project | Admin, PM (Owner) |
| `GET`  | `/api/projects/:id/activity` | Get project activity log stream | Admin, PM (Owner) |

### Tasks (`/api/tasks`)
| Method | Endpoint | Purpose | Access |
|--------|----------|---------|--------|
| `GET`  | `/api/tasks` | List tasks with filters | Authenticated |
| `POST` | `/api/tasks` | Create task in project | Admin, PM (Owner) |
| `GET`  | `/api/tasks/:id` | Get task details | Authenticated |
| `PUT`  | `/api/tasks/:id` | Update task status or details | Admin, PM, Dev (Assignee) |
| `DELETE`|`/api/tasks/:id` | Delete task | Admin, PM (Owner) |

### Notifications (`/api/notifications`)
| Method | Endpoint | Purpose | Access |
|--------|----------|---------|--------|
| `GET`  | `/api/notifications` | List user notifications | Authenticated |
| `GET`  | `/api/notifications/unread-count` | Get unread notification count | Authenticated |
| `PATCH`| `/api/notifications/:id/read` | Mark notification as read | Authenticated |
| `PATCH`| `/api/notifications/read-all` | Mark all notifications as read | Authenticated |

### Health (`/api`)
| Method | Endpoint | Purpose | Access |
|--------|----------|---------|--------|
| `GET`  | `/api/health` | System status & DB connection health | Public |

---

## 13. Environment Variables

Environment variables are managed in `.env` at the project root. Refer to `.env.example` for the full structure:

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/client_dashboard?schema=public"

# Server Configuration
PORT=5001
NODE_ENV=development

# Client Configuration
CLIENT_URL=http://localhost:5173

# Authentication & Security Secrets (PLACEHOLDERS ONLY - DO NOT COMMIT REAL SECRETS)
JWT_ACCESS_SECRET="your-jwt-access-secret-placeholder"
JWT_ACCESS_EXPIRES_IN="1h"
JWT_REFRESH_SECRET="your-jwt-refresh-secret-placeholder"
JWT_REFRESH_EXPIRES_IN="7d"
COOKIE_SECRET="your-cookie-secret-placeholder"
```

---

## 14. Local Setup

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database (Local or Cloud PostgreSQL instance like Neon)
- `npm` package manager

### Step-by-Step Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/velozity/velozity-project-hub.git
   cd velozity-project-hub
   ```

2. **Install all dependencies**:
   ```bash
   npm run install:all
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   # Edit .env and supply your DATABASE_URL and secret key placeholders
   ```

4. **Generate Prisma Client**:
   ```bash
   npm run prisma:generate
   ```

5. **Apply Database Migrations / Schema Push**:
   ```bash
   npx prisma db push
   ```

6. **Seed Demo Data**:
   ```bash
   npm run db:seed
   ```

7. **Start Server & Client Concurrently**:
   ```bash
   npm run dev
   ```

   - **Backend Server**: Running at `http://localhost:5001`
   - **Frontend Client**: Running at `http://localhost:5173`

---

## 15. Seed Data

Running `npm run db:seed` seeds deterministic development data:

- **Users**: 7 accounts (1 Admin, 2 PMs, 4 Developers)
- **Clients**: 3 Client organizations
- **Projects**: 3 Projects with client associations
- **Tasks**: 15 Tasks covering all statuses (`TO_DO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `OVERDUE`) and priorities
- **Activity & Notifications**: Pre-seeded audit logs and sample unread notifications

### Demo Accounts (Development Only)
*All demo accounts use password: `Password123!`*

| Role | Email | Name |
|------|-------|------|
| **Admin** | `admin@velozity.test` | System Admin |
| **Project Manager** | `pm1@velozity.test` | PM Alpha |
| **Project Manager** | `pm2@velozity.test` | PM Beta |
| **Developer** | `dev1@velozity.test` | Dev One |
| **Developer** | `dev2@velozity.test` | Dev Two |
| **Developer** | `dev3@velozity.test` | Dev Three |
| **Developer** | `dev4@velozity.test` | Dev Four |

---

## 16. Testing & Verification

The repository includes explicit automated verification scripts for core features:

### Running Code & Schema Verifications
```bash
# Validate Prisma Schema
npm run prisma:validate

# Build Server
npm --prefix server run build

# Build Client
npm --prefix client run build
```

### Verified Test Suites
- `scratch/test_phase4.sh` — REST API endpoint verification & authentication tests.
- `scratch/test_phase5.ts` — Role-based access control & permission enforcement tests.
- `scratch/test_phase6.ts` — Real-time Socket.io room join & activity broadcast tests.
- `scratch/test_phase7.ts` — Real-time notification & unread count badge tests.
- `scratch/test_phase9.ts` — Security, token rotation, and invalid request rejection tests.
- `scratch/test_phase10.ts` — Complete end-to-end integration audit test suite.
- `scratch/test_phase11.ts` — Real-time task-assignment notification & badge update verification.
- `scratch/test_phase12.ts` — Live PM dashboard update verification for developer task status changes.
- `scratch/test_phase13.ts` — Assignment MVP requirements audit & filter regression verification.
- `scratch/test_phase14.ts` — Multi-user real-time synchronization & notification isolation test suite.
- `scratch/test_dev_status_counts.ts` — Developer Dashboard task status count calculation verification.

---

## 17. Security

- **Server-Side Authorization**: Every API request is verified server-side via `authenticate` and `authorizeRole` middleware.
- **In-Memory Access Tokens**: Prevents XSS-based token theft by avoiding local/session storage.
- **HttpOnly Refresh Cookies**: Mitigates script access to long-lived credentials (`HttpOnly`, `SameSite=Lax`, `Secure` in production).
- **Refresh Token Hashing**: SHA-256 hashes prevent plain-text token extraction if database backup is exposed.
- **Input Validation**: Strict input validation using Zod schemas for all payload data.
- **Rate Limiting**: Protects authentication endpoints against brute-force attacks (`express-rate-limit`).
- **HTTP Security Headers**: Uses `helmet` to set secure HTTP response headers.

---

## 18. Known Limitations

- **Email Notifications**: Current MVP implementation delivers persistent in-app notifications and real-time Socket.io alerts. Email integration (e.g., SendGrid/Nodemailer) is not enabled.
- **File Attachments**: Tasks and projects support text descriptions and specifications; direct file attachment upload is reserved for future releases.

---

## 19. Implementation Architecture & Design Rationale

Velozity Project Hub implements a resilient client-project management platform engineered for real-time collaboration and security. Server-side role-based access control (RBAC) middleware guarantees strict authorization for Admin, Project Manager, and Developer roles, isolating developer task boundaries and protecting REST endpoints. Data persistence and relational integrity are managed via PostgreSQL and Prisma ORM, utilizing targeted composite database indexes on frequently queried fields like `[assignedToId, status]`, `[projectId, status]`, and `[userId, isRead, createdAt]` to improve query performance for frequently filtered and scoped data.

Authentication employs dual JWT tokens with short-lived access tokens stored strictly in frontend memory and 7-day refresh tokens secured within HttpOnly, SameSite cookies. Refresh token hashes are tracked in PostgreSQL, enabling session rotation and immediate revocation. Real-time updates utilize Socket.io/WebSockets rather than polling, managing authenticated user rooms and project rooms to broadcast activity feed events, task assignments, and live unread notification badge updates.

Background automation is powered by a node-cron job that periodically evaluates overdue tasks, transitions their status, and writes persistent system activity logs. User notifications are persisted in PostgreSQL to support offline recovery and real-time delivery. Centralized Zod validation, Helmet security headers, rate limiting, and structured global error handling provide robust protection against malicious input and information disclosure.

---

## 20. Documentation Audit Checklist

- [x] All documented CLI commands verified against root and package manifests.
- [x] All REST routes verified against Express router definitions.
- [x] Environment variable names match `.env.example` and `server/src/config/env.ts`.
- [x] Database models and indexes match `prisma/schema.prisma`.
- [x] Seed account emails and passwords match `prisma/seed.ts`.
- [x] Test suite files confirmed to exist in the repository.
- [x] Codebase structure reflects the final cleaned repository state.
