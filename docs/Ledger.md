# Ledger

PersonalFinanceOS uses a ledger-first model. Account balances are not manually stored or directly updated. They are calculated from posted transaction entries.

## Philosophy

The ledger is the financial source of truth. Every financial event should become one transaction with one or more entries. Reports, balances, outstanding amounts, and summaries are projections over those entries.

This keeps the system auditable:

- A balance can be explained by its entries.
- A correction can be represented as a transaction.
- Voiding preserves history.
- Forecasts do not accidentally affect real balances.

## Core Concepts

### Transaction

A transaction is the durable record of a financial event. Examples:

- Income
- Expense
- Transfer
- Opening Balance
- Credit Card Purchase
- Credit Card Refund
- Credit Card Payment

### Transaction Entry

A transaction entry is the amount applied to a specific account. Account balances are the sum of posted entries.

```text
account balance = SUM(transaction_entries.amount where transaction.status = Posted)
```

Voided transactions are excluded.

## Opening Balance

Opening balance is not a column on `accounts`. It is a posted `OpeningBalance` transaction. If a baseline must be adjusted, the system updates or creates a seed-owned opening-balance adjustment transaction instead of overwriting an account balance.

## Void

Void does not hard delete a transaction. It marks the transaction so its entries are excluded from balance calculations while preserving audit history.

## Transfer

A transfer moves value between two asset accounts:

```text
from account: -amount
to account:   +amount
```

The net effect across all assets is zero, but each account balance changes.

## Income

Income increases an asset account and usually belongs to an income category.

```text
asset account: +amount
```

## Expense

Expense decreases an asset account and belongs to an expense category.

```text
asset account: -amount
```

## Credit Card Purchase

A credit card purchase increases credit card liability.

```text
credit card account: +amount
```

The UI shows this as a positive outstanding amount, even though the account type is a liability.

## Credit Card Payment

A credit card payment reduces both the payment account asset and the credit card liability.

```text
payment bank account: -amount
credit card account:  -amount
```

Credit card payments are not ordinary expenses. They are debt settlement movements.

## Forecasts Are Not Ledger

Recurring templates, upcoming reminders, installment schedule items, and Quest Log reminders are forecasts. They do not create ledger entries until the user explicitly posts them.

## Design Rule

If a feature needs to change money, it should create, update, void, or post a transaction. It should not directly mutate account balances.
