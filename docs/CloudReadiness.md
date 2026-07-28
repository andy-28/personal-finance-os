# Cloud Readiness

This checklist tracks the gap between local dogfooding and production cloud usage.

## Ready

- [x] Docker Compose for PostgreSQL and Redis.
- [x] Production Dockerfile for the backend API.
- [x] EF Core migrations.
- [x] Ledger-first balance calculation.
- [x] Authentication baseline.
- [x] Personal Seed and verification scripts.
- [x] Richart and ESUN statement import flow.
- [x] Aether UI Framework.
- [x] Documentation and ADR foundation.
- [x] User Settings table and API.
- [x] Workshop settings synced through User Settings.
- [x] Goal Bars synced through User Settings.
- [x] Deployment, backup, and security documentation.
- [x] Render-ready backend Docker configuration.
- [x] Production health response hides dependency exception details.
- [x] Production environment variable template.

## Not Ready Yet

- [x] Production deployment target selected for the first dry run: Neon + Render + Upstash + Vercel.
- [ ] Production CORS policy configured with the final deployed frontend origin.
- [ ] HTTPS reverse proxy configured.
- [ ] Automated production backups verified.
- [ ] E2E smoke tests.
- [ ] Monitoring and alerting.
- [ ] Rate limiting.
- [ ] Dashboard.
- [ ] Budget.
- [ ] Full Goal domain.
- [ ] Workshop asset upload and storage.

## Production Gate

Before real production use, the project should complete at least one dry run on a staging environment with a restored database, migration execution, login, statement import, quick add, settings sync, and backup restore verification.
