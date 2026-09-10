# GridWars — Car Racing Social App

Sign up with your UK registration plate, build out your car in the garage,
add mods, and get auto-matched against other online players every 5 minutes
in "top trumps" style stat battles.

## Stack

- **Backend:** Node.js + Express + PostgreSQL (`/backend`)
- **Frontend:** Next.js (pages router) + React (`/frontend`)
- **Database:** PostgreSQL — schema in `backend/db/schema.sql`

## Project structure

```
backend/
  routes/          auth, cars, mods, leaderboard
  services/        business logic (auth, cars, mods, matchmaking, xp)
  middleware/       JWT auth middleware
  db/              schema.sql, connection pool, migration runner
  server.js        Express app entry point
  .env             local backend config (not committed)

frontend/
  pages/           signup, login, dashboard, garage, show, leaderboard
  components/      Navbar, CarCard, StatBar, MatchCard
  lib/             api.js — fetch wrapper for the backend API
  .env.local       local frontend config (not committed)
```

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ running locally (or reachable via `DATABASE_URL`)

## Setup

1. **Install dependencies** (from the repo root):

   ```bash
   npm run install:all
   ```

2. **Configure environment variables.**

   Copy the example files and adjust as needed:

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.local.example frontend/.env.local
   ```

   `backend/.env` needs a `DATABASE_URL` pointing at a Postgres database, e.g.:

   ```
   DATABASE_URL=postgres://carracing:carracing_dev_pw@localhost:5432/carracing_dev
   ```

3. **Create the database** (if it doesn't exist yet):

   ```bash
   createuser carracing --pwprompt   # or use an existing role
   createdb carracing_dev -O carracing
   ```

4. **Run the migration** to create tables (`users`, `cars`, `mods`, `matches`, `user_xp`):

   ```bash
   npm run db:migrate
   ```

## Running the app

From the repo root, start both servers together:

```bash
npm run dev
```

- Backend API: http://localhost:3001 (health check at `/health`)
- Frontend: http://localhost:3000

Or run them individually:

```bash
npm run dev:backend
npm run dev:frontend
```

## API overview

| Method | Path                          | Description                          |
| ------ | ----------------------------- | ------------------------------------- |
| POST   | `/api/auth/signup`            | Create account with UK reg plate      |
| POST   | `/api/auth/login`             | Log in, returns JWT                   |
| GET    | `/api/cars`                   | List your cars (auth required)        |
| GET    | `/api/cars/public/all`        | Public feed of recently added cars    |
| GET    | `/api/cars/:carId`            | Car details + mods                    |
| POST   | `/api/cars`                   | Add a car to your garage (auth)       |
| PUT    | `/api/cars/:carId`            | Update a car (auth, owner only)       |
| DELETE | `/api/cars/:carId`            | Remove a car (auth, owner only)       |
| POST   | `/api/cars/:carId/mods`       | Add a mod to a car (auth, owner only) |
| DELETE | `/api/mods/:modId`            | Remove a mod (auth, owner only)       |
| GET    | `/api/leaderboard`            | Top drivers by XP                     |
| GET    | `/api/leaderboard/matches/mine` | Your match history (auth)           |

## Matchmaking

The backend runs a matchmaking round every `MATCH_INTERVAL_MINUTES` (default
5) minutes: active cars are shuffled, paired up, and compared on a random
"top trumps" stat (BHP, top speed, 0-60, weight, or handling). Winners gain
XP and climb the leaderboard.

## Next steps (beyond Stage 1)

- Real-time presence tracking so matchmaking only pairs genuinely online users
- WebSocket/live push for match results instead of polling
- Image uploads for cars and mods
- Password reset / email verification
