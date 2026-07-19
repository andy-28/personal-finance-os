# ADR 0001: Credit Card Ledger And Installment Strategy

## Status

Accepted for Sprint 3.

## Context

PersonalFinanceOS derives account balances only from posted `transaction_entries.amount`. Credit cards must follow that rule and must not store a separate balance, outstanding amount, available credit, or statement total.

## Decision

Credit card accounts remain regular `accounts` rows with `type = CreditCard`. Card-specific settings live in `credit_card_accounts`.

The Sprint 2 liability convention is preserved:

- Credit card purchase: positive entry on the credit card account, increasing recorded liability.
- Credit card refund: negative entry on the credit card account, decreasing recorded liability.
- Credit card payment: negative entry on the payment bank account and negative entry on the credit card account, decreasing both bank assets and recorded credit card liability.

Credit card payments use their own `CreditCardPayment` transaction type so reporting can exclude them from ordinary expense totals.

Statement periods are calculated from `statement_closing_day` and `payment_due_day`. If a configured day does not exist in a month, the month end date is used. A due day later than the closing day is in the same month as the closing statement; a due day earlier than or equal to the closing day is in the following month.

Installment plans are forecasts. Creating an installment plan creates `installment_plans` and `installment_schedule_items`, but does not create posted ledger entries and does not change account balances. Each installment should create a posted credit card transaction only when that installment actually occurs.

## Consequences

`outstandingAmount`, `availableCredit`, `creditUtilization`, estimated statement amount, and remaining installment commitment are query-time calculations. They are never stored on `accounts`.
