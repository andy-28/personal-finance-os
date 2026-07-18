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

Sprint 2 intentionally does not include credit card statements, credit card payment matching, installments, budgets, goals, recurring transactions, CSV import, bank sync, dashboards, forecasting, AI, attachments, shared accounts, or split bills.

## Ledger Rules

- Account balance is `SUM(transaction_entries.amount)` for posted transactions.
- Voided transactions are excluded from balances.
- The `accounts` table does not store balance, current balance, available balance, initial balance, or opening balance columns.
- Opening balance is a posted `OpeningBalance` transaction with one entry.
- Void transaction does not hard delete data.
- `npm run db:reset` recreates the local database and requires `npm run migrate` afterward.

## Scripts

- `npm run setup`: starts Docker services, restores .NET tools/packages, and installs frontend packages.
- `npm run migrate`: applies EF Core migrations to the local PostgreSQL database.
- `npm run dev`: runs the API and frontend together.
- `npm run test`: runs backend tests.
- `npm run db:reset`: recreates PostgreSQL and Redis containers.
- `npm run down`: stops Docker services.

The setup helpers in `scripts/setup.ps1`, `scripts/setup.cmd`, and `scripts/setup.sh` are thin wrappers that delegate to `npm run setup`.

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
