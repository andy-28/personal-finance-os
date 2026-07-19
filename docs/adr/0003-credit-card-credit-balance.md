# ADR 0003: Credit Card Credit Balance

## Status

Accepted for Sprint 4.

## Context

Credit card ledger balance can become negative when payments or refunds exceed posted charges. Hiding that value behind `outstandingAmount = max(balance, 0)` loses useful information.

## Decision

Credit card summary exposes both:

- `outstandingAmount = max(ledgerBalance, 0)`
- `creditBalance = max(-ledgerBalance, 0)`

Available credit uses the real usable amount:

```text
availableCredit = creditLimit - outstandingAmount + creditBalance
```

This can exceed the original credit limit when the account has an overpayment credit balance.

Estimated statement values are split:

- `statementCharges`
- `statementCredits`
- `estimatedStatementNet`
- `estimatedAmountDue = max(estimatedStatementNet, 0)`

## Consequences

The UI can show overpayment as a credit balance and can show statement credits without displaying a negative amount due. Ledger values remain unchanged and are still calculated from posted entries.
