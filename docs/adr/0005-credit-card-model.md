# ADR 0005: Credit Card Model

## Status

Accepted for Sprint 5.3 documentation.

## Context

Credit cards need to show bank-app style values such as outstanding amount, billed amount, unbilled amount, available credit, due date, and installment forecasts. At the same time, they must remain compatible with ledger-first accounting.

## Decision

Credit cards are represented as normal accounts with `type = CreditCard` plus card-specific configuration.

Credit card purchases increase recorded liability. Refunds and payments reduce recorded liability. Payments also reduce the selected payment account asset.

The UI separates:

- Total outstanding
- Billed outstanding
- Unbilled amount
- Available credit
- Credit balance, when overpaid

Installments are forecasts until schedule items are posted.

## Consequences

Credit card data remains compatible with the ledger. UI calculations can match user expectations without storing duplicate balances. Import, manual entry, payment, and installment flows all converge into transactions and entries.
