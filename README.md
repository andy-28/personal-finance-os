# Personal Finance OS

Personal Finance OS is a local-first monorepo for a personal finance workspace. Sprint 2 adds a ledger-first transaction model, opening balances, calculated account balances, and transaction workflows on top of the Sprint 0/Sprint 1 foundation.

## Prerequisites

- Git
- Docker Desktop
  - Windows: enable the WSL2 backend in Docker Desktop.
  - macOS: Docker Desktop works on Intel and Apple Silicon.
- .NET SDK 8
- Node.js 22

## Quick Start

```bash
git clone <repo-url>
cd personal-finance-os
npm install
npm run setup
npm run migrate
npm run dev
```

Open these URLs:

```text
Frontend: http://localhost:3100
API: http://localhost:5000
Swagger: http://localhost:5000/swagger
Health: http://localhost:5000/health
```

FlashShop uses `http://localhost:3000`. PersonalFinanceOS uses `http://localhost:3100`, so both projects can run at the same time.

Register a new development account from `/register`; no seed user is created.

## Sprint 1 Features

- Register and login with JWT access tokens and rotated refresh tokens.
- Refresh token storage uses a Next.js BFF route and HttpOnly cookie.
- Access tokens are kept in browser memory only.
- Account CRUD, archive, restore, and reorder.
- Category CRUD, parent/child hierarchy, archive, restore, and reorder.
- System status lives at `/system-status`.

## Sprint 2 Features

- Ledger-first transactions with `Transaction` and `TransactionEntry`.
- Income, expense, transfer, and opening balance transaction types.
- Account balances are calculated from posted transaction entries.
- Account summary groups assets, liabilities, and net balance by currency.
- Transaction list, detail, create, edit, and void flows.

## Sprint 3 Features

- Credit card configuration for `CreditCard` accounts.
- Credit card purchase, refund, and payment workflows built on ledger entries.
- Credit card summary with outstanding amount, available credit, utilization, statement period, estimated statement amount, and payment dates.
- Statement period calculation that handles short months and leap years.
- Installment plan and schedule model for forecast-only commitments.

## Sprint 4 Features

- Quick Add global workflow for income, expense, transfer, credit card purchase, and credit card payment.
- Recurring transaction templates with pending occurrences for weekly, monthly, and yearly schedules.
- Upcoming page for overdue, today, next 7 days, and later items.
- User-confirmed recurring occurrence posting; no background auto-posting.
- Installment schedule item posting into real credit card purchase transactions.
- Credit card credit balance and estimated statement split fields.

Sprint 2 intentionally does not include credit card statements, credit card payment matching, installments, budgets, goals, recurring transactions, CSV import, bank sync, dashboards, forecasting, AI, attachments, shared accounts, or split bills.

Sprint 3 intentionally does not include PDF statement parsing, bank APIs, Gmail APIs, stock prices, exchange-rate sync, budgets, goals, AI categorization, or complex rules.

Sprint 4 intentionally does not include background jobs, automatic bank posting, recurring rule engines, or notification delivery.

## Ledger Rules

- Account balance is `SUM(transaction_entries.amount)` for posted transactions.
- Voided transactions are excluded from balances.
- The `accounts` table does not store balance, current balance, available balance, initial balance, or opening balance columns.
- Opening balance is a posted `OpeningBalance` transaction with one entry.
- Void transaction does not hard delete data.
- Credit card outstanding amount is calculated from posted credit card ledger entries and displayed as a positive liability value.
- Credit card credit balance is calculated as `max(-ledgerBalance, 0)` and displayed separately from outstanding amount.
- Installment plans are forecasts; creating a plan does not post ledger entries.
- Recurring templates and pending occurrences are forecasts; only posting an occurrence creates ledger entries.
- `npm run db:reset` recreates the local database and requires `npm run migrate` afterward.


## Development Personal Seed

The development seed is an explicit local-only command. It does not run during production startup and it does not write account balances directly. Opening balances are posted through ledger transactions, recurring items are templates only, and installment plans create forecast schedules only.

Default local credentials are configured in `backend/src/PersonalFinance.Api/appsettings.Development.json`:

```text
Email: admin01@example.local
Password: Admin01!dev
```

Override them without editing files when needed:

```bash
PFOS_SEED_EMAIL=admin01@example.local PFOS_SEED_PASSWORD='your-dev-password' npm run seed
```

Dry-run first to see creates, skips, disabled records, and missing configuration without writing to PostgreSQL:

```bash
npm run seed -- --dry-run
```

Run the seed after setup and migrations:

```bash
npm install
npm run setup
npm run migrate
npm run seed
npm run dev
```

The seed is idempotent. Running it again should report existing users, accounts, categories, credit cards, opening balances, recurring templates, and installment plans as skipped. Optional travel rows live in `personal-seed.example.json` and remain disabled until dates and card/account choices are supplied manually.
## Scripts

- `npm run setup`: starts Docker services, restores .NET tools/packages, and installs frontend packages.
- `npm run migrate`: applies EF Core migrations to the local PostgreSQL database.
- `npm run dev`: runs the API and frontend together.
- `npm run test`: runs backend tests.
- `npm run db:reset`: recreates PostgreSQL and Redis containers.
- `npm run down`: stops Docker services.

The setup helpers in `scripts/setup.ps1`, `scripts/setup.cmd`, and `scripts/setup.sh` are thin wrappers that delegate to `npm run setup`.

The default Docker ports are PostgreSQL `55432` and Redis `56379` so this project can run alongside other local apps that use `5432` or `6379`. Override them only when needed:

```bash
POSTGRES_PORT=55433 REDIS_PORT=56380 \
ConnectionStrings__Postgres='Host=localhost;Port=55433;Database=personal_finance;Username=pfos;Password=pfos_dev_password' \
ConnectionStrings__Redis='localhost:56380' \
npm run dev
```

## Reset Database

```bash
npm run db:reset
npm run migrate
```

`db:reset` deletes the local PostgreSQL Docker volume.

## Repository Layout

```text
personal-finance-os/
  backend/
    src/
      PersonalFinance.Api/
      PersonalFinance.Application/
      PersonalFinance.Domain/
      PersonalFinance.Infrastructure/
    tests/
  frontend/
  docs/adr/
  scripts/
```

## Validation

```bash
npm install
npm run setup
npm run migrate
npm run test
cd backend && dotnet restore
cd backend && dotnet build --no-restore
cd backend && dotnet format --verify-no-changes --no-restore
cd backend && dotnet test --no-build
cd frontend && npm run lint
cd frontend && npx tsc --noEmit
cd frontend && npm run build
```

Production JWT signing keys must be supplied through environment variables such as `Jwt__SigningKey`; do not commit production secrets.
