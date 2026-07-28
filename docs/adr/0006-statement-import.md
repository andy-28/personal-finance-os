# ADR 0006: Statement Import Review-before-Post

## Status

Accepted for Sprint 5.3 documentation.

## Context

Bank PDF statements can contain ambiguous rows, split descriptions, foreign-currency rows, fees, payments, installment summaries, and provider-specific formatting. Directly posting parser output would risk incorrect ledger entries and duplicate transactions.

## Decision

Statement Import uses a review-before-post pipeline:

```text
PDF -> Parser -> Import Batch -> Import Rows -> Review -> Post -> Ledger
```

Parsers create statement import batches and rows. Users can review row type, amount, category, and status before posting. Only posted rows create ledger transactions.

PDF passwords are request-only and are not stored.

## Consequences

The ledger remains protected from parser mistakes. Users can fix unknown rows, retry failed rows, ignore rows, or discard imports without corrupting financial history. Provider parsers can evolve independently while keeping the review model stable.
