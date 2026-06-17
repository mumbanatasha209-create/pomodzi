# Pamodzi Finance

Community savings groups (chamas / stokvels) and village banking for Africa —
powered by a Rust + Axum API, PostgreSQL, the Stellar testnet, and a mobile-first
Next.js 15 frontend.

> **Pamodzi** means *"together"* — save together, grow together.

## Architecture

```
NATA/
├── backend/        Rust (Axum + SQLx) REST API, JWT auth, Stellar wallets
│   ├── migrations/ SQLx migrations (0001_init.sql)
│   └── src/        Handlers, models, services
├── frontend/       Next.js 15 (App Router) + Tailwind + shadcn-style UI
│   └── src/
│       ├── app/        Routes (landing, auth, dashboard)
│       ├── components/ UI primitives, layout shell, group widgets
│       ├── context/    Auth provider
│       └── lib/        API client, types, helpers
└── database/
    └── schema.sql  Documented reference schema (mirrors 0001_init.sql)
```

## Prerequisites

- **PostgreSQL** 14+
- **Rust** 1.75+ (stable toolchain via [rustup](https://rustup.rs))
- **Node.js** 18.18+ (or 20+) and npm
- Internet access for the Stellar **testnet** (Horizon + Friendbot)

---

## 1. PostgreSQL setup

Create the database and a user:

```bash
# Open a psql shell as a superuser
psql -U postgres

CREATE DATABASE pamodzi;
-- (optional) dedicated role
CREATE USER pamodzi WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE pamodzi TO pamodzi;
\q
```

The schema is applied automatically by the backend on startup via SQLx
migrations (`backend/migrations`). To inspect or apply it manually, use the
documented reference at `database/schema.sql`:

```bash
psql -U postgres -d pamodzi -f database/schema.sql
```

---

## 2. Rust backend

```bash
cd backend

# Configure environment
cp .env.example .env
# Edit .env: set DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY, etc.

# Generate secure secrets (required — backend refuses to start without them):
#   openssl rand -hex 32   # use for JWT_SECRET
#   openssl rand -hex 32   # use for ENCRYPTION_KEY

# Build & run (migrations run on boot)
cargo run
```

The API listens on `SERVER_ADDR` (default `0.0.0.0:8080`).

Key environment variables (see `backend/.env.example`):

| Variable                | Description                                  |
| ----------------------- | -------------------------------------------- |
| `DATABASE_URL`          | PostgreSQL connection string                 |
| `SERVER_ADDR`           | Bind address (default `0.0.0.0:8080`)        |
| `JWT_SECRET`            | **Required.** Min 32 chars. Sign JWTs        |
| `ENCRYPTION_KEY`        | **Required.** 32-byte key for Stellar secrets |
| `JWT_EXPIRY_HOURS`      | Token lifetime in hours                      |
| `FRONTEND_ORIGIN`       | Allowed CORS origin                          |
| `STELLAR_HORIZON_URL`   | Stellar Horizon (testnet only)               |
| `STELLAR_FRIENDBOT_URL` | Friendbot funding endpoint (testnet)         |

### Create the first platform admin (secure)

Public registration **never** grants `platform_admin`. After the API is running, use **one** of:

**Option A — CLI (recommended)**

```bash
cd backend
cargo run --bin provision-admin -- create \
  --email you@example.com \
  --password 'choose-a-strong-password' \
  --full-name 'Platform Admin'
```

Promote an existing user:

```bash
cargo run --bin provision-admin -- promote --email you@example.com
```

Encrypt any legacy plaintext Stellar secrets:

```bash
cargo run --bin provision-admin -- encrypt-secrets
```

**Option B — SQL seed script**

```bash
psql -U postgres -d pamodzi \
  -v admin_email='you@example.com' \
  -f backend/scripts/seed_platform_admin.sql
```

The user must already exist (register normally first) before promotion.

### API overview

```
POST /api/auth/register          Create account (returns JWT + user)
POST /api/auth/login             Log in (returns JWT + user)
GET  /api/auth/me                Current user

GET  /api/wallet                 Wallet balance & Stellar public key
GET  /api/transactions           Transaction history

GET  /api/groups                 Groups the user belongs to
POST /api/groups                 Create a group
POST /api/groups/join            Join with an invite code
GET  /api/groups/:id             Group detail (members included)
POST /api/groups/:id/members     Add a member by email (admin)
POST /api/groups/:id/contribute  Contribute to the current cycle
PUT  /api/groups/:id/rotation    Update payout rotation order (admin)
GET  /api/groups/:id/contributions
GET  /api/groups/:id/payouts

GET  /api/notifications          List notifications
PUT  /api/notifications/:id/read Mark notification read

GET  /api/admin/stats            Platform stats (platform_admin)
GET  /api/admin/users
GET  /api/admin/groups
GET  /api/admin/audit-logs
```

All routes except `register`/`login` require an
`Authorization: Bearer <token>` header.

---

## 3. Next.js frontend

```bash
cd frontend

# Configure environment
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8080

npm install
npm run dev
```

The app runs at `http://localhost:3000`.

- `NEXT_PUBLIC_API_URL` points the client at the backend (defaults to
  `http://localhost:8080`).
- The JWT returned at login/register is stored in `localStorage` and attached
  to every API request by `src/lib/api.ts`.

### Production build

```bash
npm run build
npm run start
```

---

## Roles

| Role             | Capabilities                                              |
| ---------------- | --------------------------------------------------------- |
| `platform_admin` | Full platform oversight: users, groups, audit logs        |
| `group_admin`    | Manage their own groups, members and rotation             |
| `member`         | Join groups, contribute, receive payouts                  |

## Tech stack

- **Backend:** Rust, Axum, SQLx, PostgreSQL, JWT, bcrypt, Stellar (testnet)
- **Frontend:** Next.js 15, React 18, TypeScript, Tailwind CSS, shadcn-style UI,
  lucide-react icons

## License

Proprietary — Pamodzi Finance.
