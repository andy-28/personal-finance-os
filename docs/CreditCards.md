# Credit Cards

Credit Cards are regular accounts with `type = CreditCard` plus card-specific settings. They follow the same ledger-first rules as all other accounts.

## Domain Concepts

- Credit card account: the ledger account representing card liability.
- Credit card settings: issuer, card name, last four digits, limit, closing day, due day, and optional payment account.
- Statement cycle: the current billing period calculated from closing day and due day.
- Outstanding: total recorded card debt.
- Billed: the latest statement amount that remains unpaid.
- Unbilled: current-cycle charges not yet included in the latest statement.
- Available credit: usable credit based on limit and outstanding debt.
- Installment forecast: future installment schedule items that are not ledger entries until posted.

## Current Calculation Model

The system treats card liability as positive recorded debt:

```text
outstandingAmount = max(cardLedgerBalance, 0)
creditBalance     = max(-cardLedgerBalance, 0)
availableCredit   = creditLimit - outstandingAmount + creditBalance
```

When the UI needs a bank-app mental model, it separates:

- Total outstanding
- Billed outstanding
- Unbilled amount
- Available credit
- Credit balance, only when there is an overpayment

## Statement Cycle

The statement closing day and payment due day determine the card cycle. If a configured day does not exist in a month, the last day of the month is used.

## Payments

Credit card payment is a ledger transaction that reduces both:

- The selected payment account asset.
- The credit card account liability.

It should not be categorized as normal spending.

## Refunds

Refunds reduce credit card liability. If a refund exceeds outstanding debt, the card may show credit balance.

## Installments

Installment plans are forecasts. Creating a plan creates future schedule items but does not change balances. Each schedule item changes the ledger only when posted.

## Manual Entry vs Statement Import

Manual Quick Add card purchases are useful for large or important purchases before the statement arrives. Statement import later must be reviewed to avoid duplicate posting. The import pipeline keeps rows separate from posted ledger transactions until the user posts them.

## Product Principle

Credit card UI should match how users think:

- "How much do I owe?"
- "How much is already billed?"
- "How much is still unbilled?"
- "How much credit is still available?"
- "What needs to be paid next?"
