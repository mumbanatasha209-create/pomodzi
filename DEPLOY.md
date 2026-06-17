# Pamodzi Finance — Production deploy

## Architecture

| Component | Host | Notes |
|-----------|------|--------|
| Frontend (Next.js) | **Vercel** | Root directory: `frontend` |
| API (Rust/Axum) | **Railway** or **Render** | Uses `backend/Dockerfile` |
| Database | Neon / Railway / Render Postgres | Migrations run on API boot |

---

## 1. Deploy API (Railway — recommended)

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → select `pomodzi`.
2. Add **PostgreSQL** plugin (or link external Neon `DATABASE_URL`).
3. Click the **backend service** → **Settings** → set **Root Directory** to `backend`.
4. Railway detects `backend/railway.toml` and `Dockerfile` automatically.
5. **Variables** → add:

```env
JWT_SECRET=<openssl rand -hex 32>
ENCRYPTION_KEY=<openssl rand -hex 32>
FRONTEND_ORIGIN=https://YOUR-APP.vercel.app,http://localhost:3001
```

(Stellar testnet vars have sensible defaults in code.)

6. **Settings** → **Networking** → **Generate Domain** (e.g. `pamodzi-api.up.railway.app`).
7. Verify: `https://pamodzi-api.up.railway.app/health` → `ok`

### Alternative: Render

1. [render.com](https://render.com) → **New Blueprint** → connect repo (uses root `render.yaml`).
2. Set `JWT_SECRET`, `ENCRYPTION_KEY`, and `FRONTEND_ORIGIN` in the dashboard.
3. Wait for deploy; copy the API URL.

---

## 2. Deploy frontend (Vercel)

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → import `pomodzi`.
2. **Root Directory:** `frontend`
3. **Environment variable:**

```env
NEXT_PUBLIC_API_URL=https://pamodzi-api.up.railway.app
```

4. Deploy → copy your URL (e.g. `https://pamodzi.vercel.app`).
5. Update backend `FRONTEND_ORIGIN` with that URL and redeploy the API.

---

## 3. Create platform admin

After API + DB are live, from your machine (with `DATABASE_URL` pointing at production):

```bash
cd backend
export DATABASE_URL="postgres://..."
cargo run --bin provision-admin -- create \
  --email you@example.com \
  --password 'YourSecurePassword' \
  --full-name 'Platform Admin'
```

---

## Generate secrets (PowerShell)

```powershell
# JWT_SECRET (64 hex chars)
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })

# Run twice — once for JWT_SECRET, once for ENCRYPTION_KEY
```

Or with OpenSSL: `openssl rand -hex 32`

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS error | `FRONTEND_ORIGIN` must exactly match Vercel URL (include `https://`) |
| API won't start | Check Railway logs; `JWT_SECRET` min 32 chars, `ENCRYPTION_KEY` must be 64 hex chars |
| Login network error | `NEXT_PUBLIC_API_URL` on Vercel must be HTTPS backend URL |
| Build fails on Railway | Ensure root directory is `backend`, not repo root |
