# ADR 0004: Ledger-first Architecture

## Status

Accepted for Sprint 5.3 documentation.

## Context

PersonalFinanceOS must provide explainable balances across cash, bank accounts, credit cards, recurring forecasts, statement imports, and future reporting. A direct `current_balance` column on accounts would be easy to display but difficult to audit and repair.

## Decision

Account balances are calculated from posted transaction entries.

The system stores financial facts:

- Transactions
- Transaction entries
- Account settings
- Credit card settings
- Statement import rows before posting
- Recurring templates and forecast occurrences

The system does not store derived account balances on the account row.

Opening balance is represented as a posted transaction. Adjustments should be represented as ledger transactions rather than direct account mutation.

## Consequences

Balances remain explainable and repairable. Reporting can be built from a consistent transaction history. New features must respect the rule that changing money means creating, updating, posting, or voiding a transaction.
