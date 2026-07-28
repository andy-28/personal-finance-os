# Roadmap

The roadmap is intentionally flexible. PersonalFinanceOS is developed through dogfooding, so real usage should continue to influence priorities.

## Completed

### Sprint 0

- Project initialization
- Monorepo structure
- Docker Compose
- PostgreSQL and Redis
- Health checks
- CI foundation

### Sprint 1

- Authentication
- Accounts
- Categories
- JWT and refresh-token flow

### Sprint 2

- Ledger-first transactions
- Transaction entries
- Calculated account balances
- Opening balance
- Transaction list/detail/edit/void

### Sprint 3

- Credit Card domain
- Purchases
- Refunds
- Payments
- Statement cycle calculation
- Installment forecast model

### Sprint 4

- Quick Add
- Recurring templates
- Upcoming items
- Installment posting
- Credit card credit-balance display

### Sprint 5

- Richart PDF Statement Import
- ESUN PDF Statement Import
- Import review rows
- Retry / discard / post flow
- Import history
- Personal Baseline Seed

### Sprint 5.2

- Aether UI Framework
- Credit Card management redesign
- Quest Log
- Workshop
- System Status polish
- Recurring and Categories Aether Management Window polish
- Visual effects proof of concept

### Sprint 5.3

- Documentation & Product Readiness
- README refresh
- Developer docs
- Architecture Decision Records

### Sprint 5.4

- User Settings domain
- User Settings database table and REST API
- SettingsProvider frontend foundation
- Workshop settings server sync
- Goal Bars server sync
- Theme and Visual Slot settings foundation
- Deployment, Backup/Restore, Security, and Cloud Readiness documentation

## Next

### Sprint 5.5

Potential focus:

- Production dry run
- E2E smoke tests
- CI hardening
- Settings sync polish
- Backup restore drill

### Sprint 6

Potential focus:

- Dashboard
- Monthly report
- Net worth overview
- Monthly income/expense summary
- Credit card status overview
- Category spending breakdown

## Future

- Budget
- Full Goal domain
- Workshop asset upload and DB-backed asset library
- Cloud deployment
- Investment tracking
- Analytics and trend reports
- Mobile UX refinement
- Notification delivery
- Bank or email integrations, only after security and privacy review

## Guiding Principle

The next sprint should solve the most painful real usage gap, not merely the next item in a feature checklist.
