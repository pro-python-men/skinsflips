# CS2 Skin Flipping SaaS

Monorepo:
- Backend (Express + PostgreSQL): `src/` (runs on `http://localhost:4000`)
- Frontend (Next.js): `web/skinsflip/` (runs on `http://localhost:3000`)

## Prerequisites
- Node.js (LTS recommended)
- PostgreSQL running locally

## Backend setup
1. Create `./.env` (copy from `./.env.example`) and set:
   - `JWT_SECRET`
   - `DB_PASSWORD` (and other DB values if needed)
2. Install and migrate:
   - `npm install`
   - `npm run migrate`
3. Run API:
   - `npm run dev:api`

## Frontend setup
1. Create `./web/skinsflip/.env.local` (copy from `./web/skinsflip/.env.local.example`):
   - `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api`
2. Install and run:
   - `cd web/skinsflip`
   - `npm install`
   - `npm run dev`

## Auth flow
- Register/login via the frontend UI.
- The frontend stores the backend JWT in an HttpOnly cookie (`token`).
- Frontend calls `/api/*` Next route handlers which proxy to the backend with `Authorization: Bearer <token>`.

