# Deployment

PersonalFinanceOS is not deployed in Sprint 5.4. This document defines the cloud-ready shape required before production deployment.

## Current Runtime

- Frontend: Next.js on port 3100 in development.
- Backend: ASP.NET Core API on port 5000 in development.
- Database: PostgreSQL.
- Cache/session infrastructure: Redis.
- Local orchestration: Docker Compose.

## Local Development

```bash
npm install
npm run setup
npm run migrate
npm run dev
```

## Environment Variables

Root `.env` drives Docker Compose and backend development secrets.

Required values:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `POSTGRES_PORT`
- `REDIS_PORT`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `JWT_SIGNING_KEY`
- `JWT_ACCESS_TOKEN_MINUTES`
- `JWT_REFRESH_TOKEN_DAYS`

Frontend `.env.local`:

- `NEXT_PUBLIC_API_URL`

Production must replace every development secret with a strong value managed by the hosting provider secret store.

## PostgreSQL

Production requires a durable PostgreSQL instance with automated backups enabled. Neon, Railway, Render PostgreSQL, Supabase Postgres, or a VPS-managed PostgreSQL instance are reasonable future options.

## Redis

Redis is currently required by the API runtime health and infrastructure path. A production deployment should provision Redis or explicitly remove that runtime dependency in a future architecture decision.

## Migrations

Apply EF Core migrations before starting a production API version:

```bash
cd backend
dotnet ef database update --project src/PersonalFinance.Infrastructure --startup-project src/PersonalFinance.Api
```

## Future Hosting Options

- Frontend: Vercel, Render static/web service, or a VPS reverse proxy.
- Backend: Render, Railway, Fly.io, Azure App Service, or a VPS systemd service.
- Database: Neon, Railway Postgres, Supabase, or VPS PostgreSQL.
- Reverse proxy: Caddy or Nginx with HTTPS.

## Production Checklist

- Strong JWT signing key.
- HTTPS only.
- Production database URL configured.
- Redis configured.
- Migrations applied.
- Backups tested.
- CORS restricted to production frontend origin.
- Health endpoint monitored.
- Logs reviewed for secrets.
