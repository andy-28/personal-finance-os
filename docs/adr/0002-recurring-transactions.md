# ADR 0002: Recurring Transactions

## Status

Accepted for Sprint 4.

## Context

Recurring income, expenses, transfers, and credit card activity are expected future work. They must not change account balances until the user confirms that a specific occurrence happened.

## Decision

Recurring transaction templates generate pending occurrences for a limited window: overdue items plus the next 30 days. Querying upcoming items triggers generation. There is no background job in Sprint 4.

Each occurrence has a unique `(template_id, scheduled_date)` constraint to prevent duplicates. Posting an occurrence creates the real transaction and marks the occurrence as posted in one database transaction. Reposting a posted or skipped occurrence is rejected.

Editing a template updates future generation and recalculates `next_occurrence_date`; historical posted or skipped occurrences are not modified or deleted. Archiving a template prevents new occurrence generation but preserves existing occurrences.

Monthly and yearly schedules clamp missing dates to the end of the month. For example, a monthly template on day 31 schedules February occurrences on February 28 or February 29 in leap years.

## Consequences

Recurring templates and pending occurrences are forecasts. They do not affect ledger balances. Only a posted transaction created from an occurrence changes balances.
