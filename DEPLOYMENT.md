# Deployment Guide

GridWars is two services (backend API on port 3001, frontend on port 3000)
plus PostgreSQL and Redis. This doc covers local Docker deployment and
production deployment to Heroku, AWS, and DigitalOcean.

## Local (Docker Compose)

The fastest way to run the whole stack:

```bash
cp .env.example .env   # optional — every var has a dev-safe default
docker-compose up --build
```

This starts Postgres, Redis, the backend (which runs `db/migrate.js`
automatically before `server.js` on every start — safe to repeat, the
schema uses `CREATE TABLE IF NOT EXISTS`), and the frontend.

- Frontend: http://localhost:3000
- Backend health check: http://localhost:3001/health

Stop with `docker-compose down` (add `-v` to also drop the Postgres volume).

## Production deployment

All three platforms below follow the same shape: provision a managed
Postgres and Redis instance, deploy the backend as one service and the
frontend as another, wire them together with environment variables, then
run the migration once.

### 1. Database migration step (all platforms)

Run once against the production database, and again after any schema
change:

```bash
DATABASE_URL=<your production connection string> npm run db:migrate --prefix backend
```

`db/migrate.js` applies `backend/db/schema.sql`, which is idempotent
(`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) —
safe to re-run.

### 2. Environment setup step (all platforms)

Backend — see `backend/.env.example` for the full list. At minimum:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Managed Postgres connection string |
| `JWT_SECRET` | Long random value — required, server refuses to boot without it |
| `ADMIN_SECRET` | Long random value — gates `/api/admin/*` |
| `REDIS_URL` | Managed Redis connection string |
| `FRONTEND_ORIGIN` | Your deployed frontend URL (CORS) |
| `NODE_ENV` | `production` |

Frontend — one variable:

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Your deployed backend URL, reachable from the browser. Baked in at build time — changing it requires a rebuild. |

### 3. Health check URLs to verify after deploying

- `GET <backend-url>/health` — expect HTTP 200 and `"healthy": true`, with
  `database.ok`, `redis.ok`, and `scheduler.ok` all `true`. A `503` means
  one of the three subsystems is down; the response body says which.
- `GET <frontend-url>/` — expect HTTP 200 and the GridWars landing page.
- `GET <backend-url>/api/admin/stats` with header `X-Admin-Secret: <your
  ADMIN_SECRET>` — expect HTTP 200 with live stats (internal-only; also
  viewable at `<frontend-url>/admin/stats`).

---

### AWS (ECS Fargate + RDS + ElastiCache)

1. **Database & cache**: create an RDS PostgreSQL instance and an
   ElastiCache Redis instance in the same VPC.
2. **Container images**: build and push both Dockerfiles to ECR:
   ```bash
   docker build -t <account>.dkr.ecr.<region>.amazonaws.com/gridwars-backend backend/
   docker build -t <account>.dkr.ecr.<region>.amazonaws.com/gridwars-frontend \
     --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com frontend/
   docker push <account>.dkr.ecr.<region>.amazonaws.com/gridwars-backend
   docker push <account>.dkr.ecr.<region>.amazonaws.com/gridwars-frontend
   ```
3. **ECS**: create two Fargate services (backend, frontend), each with a
   task definition pointing at its image. Set the backend's environment
   variables from the table above (use Secrets Manager for `JWT_SECRET`,
   `ADMIN_SECRET`, `DATABASE_URL`). Put an Application Load Balancer in
   front of each service; point the backend's ALB health check at `/health`.
4. **Migration**: run once as a one-off ECS task using the backend image
   with command `node db/migrate.js` (or run step 1 from a machine that can
   reach RDS).
5. **DNS/TLS**: point your domain at the ALBs via Route 53 + ACM.

### Heroku

1. Create two apps: `gridwars-backend`, `gridwars-frontend`.
2. Add the Heroku Postgres and Heroku Redis add-ons to `gridwars-backend`
   (this sets `DATABASE_URL` and a Redis URL automatically — copy the
   latter into `REDIS_URL`).
3. Set the rest of the backend config vars from the table above:
   ```bash
   heroku config:set JWT_SECRET=... ADMIN_SECRET=... FRONTEND_ORIGIN=https://gridwars-frontend.herokuapp.com -a gridwars-backend
   ```
4. Deploy the backend (either `git subtree push` of the `backend/` folder,
   or `heroku container:push` using `backend/Dockerfile`):
   ```bash
   heroku container:push web -a gridwars-backend --recursive
   heroku container:release web -a gridwars-backend
   ```
5. Run the migration once: `heroku run npm run db:migrate -a gridwars-backend`.
6. Deploy the frontend the same way, setting
   `NEXT_PUBLIC_API_URL=https://gridwars-backend.herokuapp.com` as a build
   arg (Heroku's container build reads `--build-arg` from
   `heroku.yml`, or set it directly if using the Node buildpack instead of
   the container stack).

### DigitalOcean (App Platform + Managed Postgres/Redis)

1. Create a Managed PostgreSQL cluster and a Managed Redis cluster.
2. Create an App Platform app with two components pointed at this repo:
   - **backend**: source directory `backend/`, Dockerfile detected
     automatically. Set the environment variables from the table above
     (mark `JWT_SECRET`, `ADMIN_SECRET`, `DATABASE_URL` as encrypted). Set
     the HTTP health check path to `/health`.
   - **frontend**: source directory `frontend/`, Dockerfile detected
     automatically. Set `NEXT_PUBLIC_API_URL` as a build-time environment
     variable pointing at the backend component's public URL.
3. Deploy. App Platform runs the build on every push to the tracked branch.
4. Run the migration once via the App Platform console's "Console" tab on
   the backend component (`node db/migrate.js`), or from a local machine
   with `DATABASE_URL` pointed at the managed cluster (see step 1 above).

---

## Rolling back a bad deploy

Since migrations only ever add tables/columns (no destructive changes in
`schema.sql`), rolling back application code to a previous image/release is
always safe without a corresponding "down" migration.
