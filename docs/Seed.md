# Seed

The project has explicit seed flows for development and dogfooding. Seeds are never production startup behavior.

## Development Seed

Development Seed creates baseline development data such as:

- A local user
- Accounts
- Categories
- Credit cards
- Opening balances
- Recurring templates
- Installment forecasts

Run:

```bash
npm run seed
```

It is idempotent and should skip existing records where possible.

## Personal Seed

Personal Seed is for local dogfooding with personal baseline data. It must be explicitly enabled:

```bash
export ALLOW_PERSONAL_SEED=true
export PERSONAL_SEED_EMAIL='you@example.com'
npm run seed:personal:dry-run
npm run seed:personal
npm run verify:personal-seed
```

PowerShell:

```powershell
$env:ALLOW_PERSONAL_SEED="true"
$env:PERSONAL_SEED_EMAIL="you@example.com"
npm run seed:personal:dry-run
npm run seed:personal
npm run verify:personal-seed
```

## Idempotency

Seed scripts should be repeatable. Running them again should not duplicate user-owned or seed-owned baseline data.

Seed-owned records should have stable identifiers or stable notes so repair scripts can locate and update them.

## Seed-owned Baseline

Seed-owned baseline values are represented as ledger transactions where possible. The seed should not directly overwrite account balances.

## Repair Script

`npm run repair:personal-baseline` exists for repairing known personal baseline inconsistencies. It should be used carefully and should remain explicit.

## Verification Script

`npm run verify:personal-seed` checks that expected personal baseline records exist and that important totals match expectations.

## What Can Be Rebuilt

The seed can rebuild or repair:

- Seed-owned accounts
- Seed-owned categories
- Seed-owned credit card settings
- Seed-owned opening balances
- Seed-owned baseline transactions

## What Should Not Be Rebuilt

The seed should not overwrite:

- User-entered real transactions
- Posted statement import transactions
- PDF passwords
- Local file paths
- Production secrets
- LocalStorage-only UI settings such as current Goal Bars

## Product Rule

Seeds are setup tools, not business logic. If a seed must change a balance, it should do so through ledger transactions.
