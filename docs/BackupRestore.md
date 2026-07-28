# Backup and Restore

This document defines the baseline backup strategy for a future production deployment.

## What Must Be Backed Up

PostgreSQL is the source of truth for:

- Users
- Accounts
- Categories
- Transactions and ledger entries
- Credit cards
- Statement imports and import rows
- User settings

Redis is treated as infrastructure state and does not currently need long-term backup.

## Backup Command

For a Docker-based environment:

```bash
docker compose exec postgres pg_dump -U pfos -d personal_finance -Fc -f /tmp/personal_finance.dump
docker compose cp postgres:/tmp/personal_finance.dump ./backups/personal_finance.dump
```

For a managed database, use the provider backup mechanism or run `pg_dump` from a trusted runner.

## Restore Command

```bash
createdb personal_finance_restored
pg_restore -d personal_finance_restored personal_finance.dump
```

Always restore into a staging database first before replacing production.

## Seed Interaction

Development Seed and Personal Seed are idempotent helpers, not a replacement for backups. A seed can rebuild baseline data, but it cannot recover real imported statements or day-to-day transactions that were created after the seed script was written.

## Migration Interaction

Restore should use a database dump from a known schema version. After restore, run migrations only if the target application version expects a newer schema.

## Production Backup Checklist

- Daily automated database backup.
- At least one restore drill before real production use.
- Backup retention policy documented.
- Backup access restricted.
- Secrets excluded from backup artifacts.
- Restore runbook tested on a clean machine.
