# CS2 Skin Flipping SaaS

Monorepo:
- Backend (Express + PostgreSQL): `src/` (runs on `http://localhost:4000`)
- Frontend (Next.js): `web/skinsflip/` (runs on `http://localhost:3000`)

## Prerequisites
- Node.js (LTS recommended)
- PostgreSQL running locally

## Backend setup
1. Create `./.env` (copy from `./.env.example`) and set:
   - required:
     - `DB_PASSWORD` or `DATABASE_URL`
   - recommended:
     - `JWT_SECRET`
     - `STEAM_WEB_API_KEY`
     - `CSFLOAT_API_KEY`
   - (optional) Best flips BUFF Market:
     - `BEST_FLIPS_ENABLE_BUFFMARKET_BUY=1`
     - `BUFFMARKET_COOKIE=...`
     - `BEST_FLIPS_BUFFMARKET_PER_ITEM_MAX=5` (optional; default follows `BEST_FLIPS_CSFLOAT_PER_ITEM_MAX`)
     - `BUFFMARKET_FEE_RATE=0.025` (optional; default 0.025)
   - Best flips buy sources (optional query param):
     - `/flips/best?buySources=csfloat,skinport,buff`
2. Install and migrate:
   - `npm install`
   - `npm run migrate`
3. Run API:
   - `npm run dev:api`

## Frontend setup
1. Create `./web/skinsflip/.env.local` (copy from `./web/skinsflip/.env.local.example`):
   - `API_BASE_URL=http://localhost:4000/api`
   - `NEXT_PUBLIC_APP_ORIGIN=http://localhost:3000`
2. Install and run:
   - `cd web/skinsflip`
   - `npm install`
   - `npm run dev`

## Auth flow
- Register/login via the frontend UI.
- The frontend stores the backend JWT in an HttpOnly cookie (`token`).
- Frontend calls `/api/*` Next route handlers which proxy to the backend with `Authorization: Bearer <token>`.

