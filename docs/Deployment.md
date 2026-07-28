# Deployment

PersonalFinanceOS is production-deployment ready after Sprint 5.5A, but this sprint does not deploy any service. Secrets must be configured in each hosting provider before the first production launch.

## Runtime Shape

- Backend: ASP.NET Core 8 API published as a Docker image.
- Frontend: Next.js application, suitable for Vercel or another Node-capable host.
- Database: PostgreSQL, recommended first target is Neon.
- Cache/session infrastructure: Redis, recommended first target is Upstash.
- Reverse proxy/platform: Render for the backend API Docker service.

## Repository Structure Used For Deployment

- Backend solution: `backend/PersonalFinance.sln`
- Root solution: `PersonalFinanceOS.sln`
- API project: `backend/src/PersonalFinance.Api/PersonalFinance.Api.csproj`
- Infrastructure project: `backend/src/PersonalFinance.Infrastructure/PersonalFinance.Infrastructure.csproj`
- Frontend: `frontend/`
- Dockerfile path for Render: `Dockerfile`
- Docker build context: repository root

## Backend Docker Build

Build from the repository root:

```bash
docker build -t personal-finance-os-api:latest .
```

Example local container run without Docker Compose:

```bash
docker run --rm -p 8080:8080 \
  -e ASPNETCORE_ENVIRONMENT=Production \
  -e PORT=8080 \
  -e ConnectionStrings__DefaultConnection="Host=host.docker.internal;Port=55432;Database=personal_finance;Username=pfos;Password=pfos_dev_password" \
  -e ConnectionStrings__Redis="host.docker.internal:56379" \
  -e Jwt__Key="replace_with_a_long_environment_specific_signing_key_at_least_32_characters" \
  -e Jwt__Issuer="PersonalFinance.Api" \
  -e Jwt__Audience="PersonalFinance.Web" \
  -e Cors__AllowedOrigins__0="http://localhost:3100" \
  personal-finance-os-api:latest
```

The API listens on the `PORT` environment variable when present. `ASPNETCORE_URLS` remains set to `http://0.0.0.0:8080` as a container default.

## Environment Variables

Backend production variables:

- `ASPNETCORE_ENVIRONMENT=Production`
- `PORT`
- `ConnectionStrings__DefaultConnection`
- `ConnectionStrings__Redis`
- `Jwt__Key`
- `Jwt__Issuer`
- `Jwt__Audience`
- `Cors__AllowedOrigins__0`

Backward-compatible backend aliases still work:

- `ConnectionStrings__Postgres`
- `Jwt__SigningKey`

Frontend variables:

- `BACKEND_API_URL`
- `NEXT_PUBLIC_API_URL`

Use the deployed backend origin for both frontend variables unless a server-side proxy is introduced later.

## Deployment Order

1. Create Neon PostgreSQL and copy the pooled connection string.
2. Create Upstash Redis and copy the Redis connection string.
3. Apply EF Core migrations to Neon.
4. Create the Render backend Docker service.
5. Configure Render environment variables.
6. Confirm `GET /health` returns a non-error response.
7. Deploy the frontend to Vercel.
8. Set frontend environment variables to the Render backend origin.
9. Confirm login, health, accounts, credit cards, settings sync, and statement import smoke paths.

## Neon PostgreSQL

Use Neon as the production PostgreSQL provider. Enable backups/branching and keep the connection string in the hosting provider secret store.

Migration commands from Windows PowerShell:

```powershell
$env:ConnectionStrings__DefaultConnection="Host=<neon-host>;Database=<db>;Username=<user>;Password=<password>;Ssl Mode=Require;Trust Server Certificate=true"
dotnet ef database update --project backend/src/PersonalFinance.Infrastructure --startup-project backend/src/PersonalFinance.Api
```

Migration commands from macOS/Linux:

```bash
export ConnectionStrings__DefaultConnection="Host=<neon-host>;Database=<db>;Username=<user>;Password=<password>;Ssl Mode=Require;Trust Server Certificate=true"
dotnet ef database update --project backend/src/PersonalFinance.Infrastructure --startup-project backend/src/PersonalFinance.Api
```

Do not remove existing migrations. Production migration should happen before switching frontend traffic to the new API version.

## Render Backend

Create a Render Web Service with:

- Environment: Docker
- Branch: `master`
- Dockerfile Path: `Dockerfile`
- Docker Context: repository root
- Health Check Path: `/health`

Required Render environment variables:

- `ASPNETCORE_ENVIRONMENT=Production`
- `ConnectionStrings__DefaultConnection`
- `ConnectionStrings__Redis`
- `Jwt__Key`
- `Jwt__Issuer`
- `Jwt__Audience`
- `Cors__AllowedOrigins__0`

Render provides `PORT`; do not hardcode it.

## Upstash Redis

Use Upstash Redis for production Redis. Store the Redis connection string in `ConnectionStrings__Redis`. Do not log it or commit it.

## Vercel Frontend

Deploy `frontend/` as the Vercel project root. Configure:

- `NEXT_PUBLIC_API_URL=https://<render-service>.onrender.com`
- `BACKEND_API_URL=https://<render-service>.onrender.com`

After changing backend origins, redeploy the frontend so browser-side environment variables are rebuilt.

## Health Check

`GET /health` returns detailed dependency information in Development. In Production it returns a lightweight JSON status only, avoiding internal exception details.

## Seed Safety

Development seed is never automatic startup behavior. It only runs with `--seed-development` and only in Development.

Production initialization should use migrations and an explicit admin/user creation path. Do not run personal seed against production unless you intentionally want the dogfooding baseline data in that environment.

## Rollback

- Backend: redeploy the previous Render image/commit.
- Frontend: redeploy the previous Vercel deployment.
- Database: prefer forward-compatible migrations. If a rollback requires schema reversal, take a Neon backup/branch before applying the migration and restore from that backup if needed.
- Redis: treat as cache/session infrastructure; expect users may need to sign in again after Redis replacement.

## Logging And Secrets

Production logs must not include:

- JWT access tokens
- Refresh tokens
- Connection strings
- Passwords
- PDF passwords

Serilog request logging is enabled, but request bodies and secrets are not logged by default.

## Smoke Test Checklist

- `GET /health`
- Sign in
- Refresh token flow
- Accounts summary
- Credit cards summary
- User Settings persistence
- Statement import upload/review/post path with a safe test statement
- Frontend CORS from the production origin
